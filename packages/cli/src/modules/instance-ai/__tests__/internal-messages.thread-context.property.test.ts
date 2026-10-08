import { buildAttachmentManifest, hasRepeatableWorkSection } from '@n8n/instance-ai';
import fc from 'fast-check';

import { renderAiPreferencesBlock } from '@/services/ai-preference.service';

import {
	asStoredThreadContextSection,
	buildCurrentDateTimeBlock,
	buildThreadContextBlock,
	extractThreadContextBlock,
	stripAttachmentManifest,
	withoutAiPreferencesBlock,
} from '../internal-messages';

/** A section as n8n writes it, kept apart from the implementation on purpose. */
const SECTION = [
	'<repeatable-work>',
	'score: 0.6',
	'reasons: schedule-phrase',
	'When the workflow for this request works, load the make-automatic skill and offer to make it automatic once.',
	'</repeatable-work>',
].join('\n');

/** Text made of pieces that look like the blocks and the manifest, so near misses are likely. */
const textFrom = (pieces: readonly string[]) =>
	fc
		.array(fc.oneof(fc.constantFrom(...pieces), fc.string({ maxLength: 6 })), { maxLength: 12 })
		.map((parts) => parts.join(''));

const manifestLikeText = textFrom([
	'[ATTACHMENTS]',
	'[/ATTACHMENTS]',
	'\n',
	'\n\n',
	'- ',
	'- [0] `a.csv` (text/csv): parseable via parse-file (format: csv)',
	' ',
	'every day at 9',
]);

const blockLikeText = textFrom([
	'<thread-context>',
	'</thread-context>',
	'<ai-preferences>',
	'</ai-preferences>',
	'<repeatable-work>',
	'</repeatable-work>',
	`\n${SECTION}\n`,
	'\n',
	'\n\n',
	'score: 1',
	'every day at 9',
]);

type ClassifiedAttachment = Parameters<typeof buildAttachmentManifest>[0][number];

type AttachmentFields = {
	fileName: string;
	mimeType: string;
	parseable: boolean;
	unavailableReason: string | undefined;
};

/** The fields of one attached file that the manifest shows. File names and types are user input. */
const attachmentArb: fc.Arbitrary<AttachmentFields> = fc.record({
	fileName: fc.string({ maxLength: 30 }),
	mimeType: fc.string({ maxLength: 20 }),
	parseable: fc.boolean(),
	unavailableReason: fc.option(fc.constantFrom('the file is too large', 'the file is empty'), {
		nil: undefined,
	}),
});

function classified(files: AttachmentFields[]): ClassifiedAttachment[] {
	return files.map(({ fileName, mimeType, parseable, unavailableReason }, index) => ({
		original: { data: '', fileName, mimeType },
		index,
		parseable,
		...(parseable ? { format: 'csv' as const } : {}),
		...(unavailableReason !== undefined ? { unavailableReason } : {}),
	}));
}

const endsWithManifest = (text: string) => /\[\/ATTACHMENTS\]\s*$/.test(text);

describe('stripAttachmentManifest properties', () => {
	it('removes exactly the manifest that the service adds after the text', () => {
		fc.assert(
			fc.property(
				manifestLikeText.filter((text) => !endsWithManifest(text)),
				fc.array(attachmentArb, { minLength: 1, maxLength: 12 }),
				(text, files) => {
					const manifest = buildAttachmentManifest(classified(files));

					expect(stripAttachmentManifest(`${text}\n\n${manifest}`)).toBe(text);
				},
			),
		);
	});

	it('keeps a text without a manifest close tag as it is', () => {
		fc.assert(
			fc.property(
				manifestLikeText.filter((text) => !text.includes('[/ATTACHMENTS]')),
				(text) => {
					expect(stripAttachmentManifest(text)).toBe(text);
				},
			),
		);
	});
});

const sectionsArb = fc.array(blockLikeText, { minLength: 1, maxLength: 4 });

describe('extractThreadContextBlock properties', () => {
	it('returns the leading thread-context block, whatever its sections and the user text hold', () => {
		fc.assert(
			fc.property(sectionsArb, blockLikeText, fc.boolean(), (sections, userText, withSetup) => {
				const block = buildThreadContextBlock(sections);
				fc.pre(block !== '');
				const head = withSetup ? '<workflow-setup-state>\n{}\n</workflow-setup-state>\n\n' : '';

				expect(extractThreadContextBlock(`${head}${block}\n\n${userText}`)?.trimEnd()).toBe(block);
			}),
		);
	});

	it('never reads a thread-context block that follows the user text', () => {
		fc.assert(
			fc.property(
				blockLikeText.filter((text) => !text.startsWith('<')),
				sectionsArb,
				(userText, sections) => {
					const stored = `${userText}\n\n${buildThreadContextBlock(sections)}`;

					expect(extractThreadContextBlock(stored)).toBeUndefined();
				},
			),
		);
	});
});

const preferencesArb = fc.array(blockLikeText, { minLength: 1, maxLength: 3 }).map((contents) =>
	renderAiPreferencesBlock({
		instance: [],
		user: contents.map((content, index) => ({ id: `pref-${index}`, content })),
		projects: [],
	}),
);

describe('withoutAiPreferencesBlock properties', () => {
	it('removes exactly the preferences block and keeps every other section', () => {
		fc.assert(
			fc.property(preferencesArb, sectionsArb, (preferences, laterSections) => {
				const threadContext = buildThreadContextBlock([preferences, ...laterSections]);
				const stored = asStoredThreadContextSection(preferences ?? '');
				const start = threadContext.indexOf(stored);

				expect(preferences).toBeDefined();
				expect(start).toBeGreaterThan(0);
				expect(withoutAiPreferencesBlock(threadContext)).toBe(
					threadContext.slice(0, start) + threadContext.slice(start + stored.length),
				);
			}),
		);
	});

	it('never lets saved preferences pose as a section that n8n wrote', () => {
		fc.assert(
			fc.property(preferencesArb, fc.boolean(), (preferences, withSection) => {
				const threadContext = buildThreadContextBlock([
					preferences,
					withSection ? SECTION : undefined,
					buildCurrentDateTimeBlock('Monday 1 January 2026'),
				]);

				expect(hasRepeatableWorkSection(withoutAiPreferencesBlock(threadContext))).toBe(
					withSection,
				);
			}),
		);
	});
});
