import type { LinkedInstanceSummary } from '@n8n/api-types';
import fc from 'fast-check';

import { textCleaner, type RemoteSession } from '../linked-instance-sessions';
import { importOnRemote, listRemoteCredentials } from '../remote-transfer-tools';
import { ALL_TOOLS, OPS } from './transfer.test-helpers';

const LINK: LinkedInstanceSummary = {
	id: 'link-1',
	name: 'Cloud',
	baseUrl: 'https://cloud.test',
	status: 'online',
	lastVerifiedAt: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	defaultRemoteProject: OPS,
};

/** Every format and control character, so that the properties cover each of them. */
const MARKS: readonly string[] = (() => {
	const marks: string[] = [];
	for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
		const character = String.fromCodePoint(codePoint);
		if (/^[\p{Cf}\p{Cc}]$/u.test(character)) marks.push(character);
	}
	return marks;
})();

const markArb = fc.constantFrom(...MARKS);

// Tokens as the base64url alphabet writes them, long enough not to fit in "[REDACTED]".
const tokenArb = fc.stringMatching(/^[A-Za-z0-9_-]{12,64}$/);

/** The token, with marks at some positions between its characters. */
const splitTokenArb = (token: string) =>
	fc
		.array(fc.tuple(fc.integer({ min: 1, max: token.length - 1 }), markArb), {
			minLength: 1,
			maxLength: 4,
		})
		.map((cuts) =>
			[...cuts]
				.sort(([a], [b]) => b - a)
				.reduce((text, [at, mark]) => `${text.slice(0, at)}${mark}${text.slice(at)}`, token),
		);

const sessionReturning = (token: string, result: unknown): RemoteSession => ({
	link: LINK,
	callTool: async () => result,
	toolNames: new Set(ALL_TOOLS),
	clean: textCleaner(token),
});

// Text that stays on one line: no control, format or separator characters.
const isOneLine = (text: string) => !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(text);

describe('textCleaner', () => {
	it('never returns the token, also when marks split it and the text is cut', () => {
		fc.assert(
			fc.property(
				tokenArb.chain((token) => fc.tuple(fc.constant(token), splitTokenArb(token))),
				fc.string(),
				fc.string(),
				fc.option(fc.integer({ min: 4, max: 600 }), { nil: undefined }),
				([token, split], before, after, maxLength) => {
					const clean = textCleaner(token);

					expect(clean(`${before}${split}${after}`, maxLength)).not.toContain(token);
					expect(clean(`${before}${token}${after}${split}`, maxLength)).not.toContain(token);
				},
			),
		);
	});

	it('returns one line within the length limit', () => {
		fc.assert(
			fc.property(
				tokenArb,
				fc.array(fc.oneof(fc.string(), markArb), { maxLength: 40 }),
				fc.integer({ min: 4, max: 600 }),
				(token, parts, maxLength) => {
					const cleaned = textCleaner(token)(parts.join(''), maxLength);

					expect(isOneLine(cleaned)).toBe(true);
					expect(cleaned.length).toBeLessThanOrEqual(maxLength);
					expect(cleaned).toBe(cleaned.trim());
				},
			),
		);
	});
});

// Items as a newer, older or broken instance can send them.
const remoteItemArb = fc.oneof(
	fc.string(),
	fc.array(fc.oneof(fc.string(), markArb)).map((parts) => parts.join('')),
	fc.string({ minLength: 300, maxLength: 700 }),
	fc.record({ id: fc.string(), name: fc.string(), type: fc.string() }),
	fc.record({ id: fc.stringMatching(/^[A-Za-z0-9]{1,16}$/), name: fc.string(), type: fc.string() }),
	fc.anything(),
);

describe('importOnRemote', () => {
	it('never fails for list items that it cannot use, and returns clean text only', async () => {
		await fc.assert(
			fc.asyncProperty(
				tokenArb,
				fc.array(remoteItemArb, { maxLength: 8 }),
				fc.array(remoteItemArb, { maxLength: 8 }),
				fc.array(remoteItemArb, { maxLength: 8 }),
				fc.anything(),
				async (token, credentials, nodeTypes, warnings, newVersionLive) => {
					const session = sessionReturning(token, {
						workflowId: 'remote1',
						created: false,
						newVersionLive,
						credentialsNeedingSetup: credentials,
						missingNodeTypes: nodeTypes,
						warnings,
					});

					const result = await importOnRemote(session, {
						packageBase64: 'cGtn',
						sourceWorkflowId: 'wf1',
					});

					const names = result.credentialsNeedingSetup.flatMap(({ name, type }) => [name, type]);
					for (const text of [...names, ...result.missingNodeTypes]) {
						expect(isOneLine(text)).toBe(true);
						expect(text.length).toBeLessThanOrEqual(255);
						expect(text).not.toContain(token);
					}
					for (const text of result.warnings) {
						expect(text).not.toBe('');
						expect(isOneLine(text)).toBe(true);
						expect(text.length).toBeLessThanOrEqual(500);
						expect(text).not.toContain(token);
					}
					expect(result.credentialsNeedingSetup.length).toBeLessThanOrEqual(credentials.length);
					expect(result.missingNodeTypes.length).toBeLessThanOrEqual(nodeTypes.length);
					expect(result.warnings.length).toBeLessThanOrEqual(warnings.length);
					expect(result.newVersionLive).toBe(
						typeof newVersionLive === 'boolean' ? newVersionLive : undefined,
					);
				},
			),
		);
	});
});

describe('listRemoteCredentials', () => {
	const credentialArb = fc.record({ name: fc.string(), type: fc.string() });

	it('is complete exactly below the result limit, and keeps the items with a name and a type', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.array(fc.oneof(credentialArb, credentialArb, fc.anything()), { maxLength: 230 }),
				async (data) => {
					const list = await listRemoteCredentials(sessionReturning('token-1', { data }), 'p1');

					const usable = data.flatMap((item) => {
						if (typeof item !== 'object' || item === null || Array.isArray(item)) return [];
						const name: unknown = Reflect.get(item, 'name');
						const type: unknown = Reflect.get(item, 'type');
						return typeof name === 'string' && typeof type === 'string' ? [{ name, type }] : [];
					});
					expect(list).toEqual({ credentials: usable, complete: data.length < 200 });
				},
			),
			{ numRuns: 60 },
		);
	});
});
