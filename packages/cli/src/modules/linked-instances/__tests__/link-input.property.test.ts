import { randomBytes } from 'node:crypto';

import { LinkInstanceRequestDto, UpdateLinkedInstanceRequestDto } from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';
import fc from 'fast-check';

import {
	LINK_INPUT_MESSAGES,
	parseLinkInput,
	parseLinkUpdate,
	type LinkUpdateInput,
} from '../link-input';

const ADDRESS = 'https://acme.app.n8n.cloud';
const FIXED_MESSAGES: string[] = Object.values(LINK_INPUT_MESSAGES);

// Valid and invalid characters for names, with lengths around the limit of 64.
const nameArb = fc.oneof(
	fc.string({ unit: 'binary', maxLength: 70 }),
	fc
		.array(
			fc.constantFrom(
				...['a', 'Z', 'é', '運', '7', ' ', '.', '_', '(', ')', '-'],
				...['\n', '\t', '<', '"', '\u00a0', '\u200b', '🚀'],
			),
			{ maxLength: 70 },
		)
		.map((characters) => characters.join('')),
);

const visibleAsciiArb = fc.string({ unit: 'binary-ascii', maxLength: 40 });

// Valid and invalid tokens, also near the limit of 4096 characters and with outer whitespace.
const tokenArb = fc.oneof(
	visibleAsciiArb,
	fc
		.tuple(fc.constantFrom('', ' ', '\n', '\t '), visibleAsciiArb, fc.constantFrom('', ' ', '\r\n'))
		.map(([before, token, after]) => `${before}${token}${after}`),
	fc.integer({ min: 4090, max: 4100 }).map((length) => 'a'.repeat(length)),
	fc.string({ unit: 'binary', maxLength: 20 }),
);

const projectIdArb = fc.oneof(
	fc.stringMatching(/^[A-Za-z0-9_-]{1,40}$/),
	fc.string({ maxLength: 40 }),
	fc.constant(''),
);

const updateArb: fc.Arbitrary<LinkUpdateInput> = fc.record(
	{ name: nameArb, token: tokenArb, defaultRemoteProjectId: projectIdArb },
	{ requiredKeys: [] },
);

const sentKeys = (input: LinkUpdateInput) =>
	Object.entries(input)
		.filter(([, value]) => value !== undefined)
		.map(([key]) => key)
		.sort();

function settle<T>(run: () => T): { value?: T; error?: unknown } {
	try {
		return { value: run() };
	} catch (error) {
		return { error };
	}
}

describe('link input properties', () => {
	it('keeps exactly the sent fields, or names the problem in a fixed message', () => {
		fc.assert(
			fc.property(updateArb, (input) => {
				const { value, error } = settle(() => parseLinkUpdate(input));

				if (error) {
					expect(error).toBeInstanceOf(BadRequestError);
					expect(FIXED_MESSAGES).toContain((error as Error).message);
					return;
				}
				expect(Object.keys(value ?? {}).sort()).toEqual(sentKeys(input));
				if (input.name !== undefined) expect(value?.name).toBe(input.name.trim());
				if (input.token !== undefined) expect(value?.token).toBe(input.token.trim());
				if (input.defaultRemoteProjectId !== undefined) {
					expect(value?.defaultRemoteProjectId).toBe(input.defaultRemoteProjectId);
				}
			}),
		);
	});

	it('rejects only a change that changes nothing with the no-change message', () => {
		fc.assert(
			fc.property(updateArb, (input) => {
				const { error } = settle(() => parseLinkUpdate(input));

				const isNoChange = (error as Error | undefined)?.message === LINK_INPUT_MESSAGES.noChange;
				expect(isNoChange).toBe(sentKeys(input).length === 0);
			}),
		);
	});

	it('never repeats a rejected token in the error', () => {
		const rejectedTokenArb = fc
			.tuple(fc.constantFrom(' ', 'é', '\u0007', '\u200b'), fc.integer({ min: 1, max: 20 }))
			.map(([bad, at]) => {
				const valid = `tok_${randomBytes(12).toString('hex')}`;
				const parts = [valid.slice(0, at), valid.slice(at)];
				return { token: parts.join(bad), parts };
			});

		fc.assert(
			fc.property(rejectedTokenArb, ({ token, parts }) => {
				const { error } = settle(() => parseLinkUpdate({ token }));

				expect(error).toBeInstanceOf(BadRequestError);
				const text = JSON.stringify({ message: (error as Error).message, error });
				for (const part of parts) {
					if (part.length >= 4) expect(text).not.toContain(part);
				}
			}),
		);
	});

	it('accepts the same name and token as the link request DTO, with the same result', () => {
		fc.assert(
			fc.property(nameArb, tokenArb, (name, token) => {
				const dto = LinkInstanceRequestDto.safeParse({ name, url: ADDRESS, token });
				const service = settle(() => parseLinkInput({ name, address: ADDRESS, token }));

				expect(dto.success).toBe(service.error === undefined);
				if (dto.success) {
					expect(service.value).toEqual({
						name: dto.data.name,
						origin: ADDRESS,
						token: dto.data.token,
					});
				}
			}),
		);
	});

	it('accepts the same change as the update request DTO, with the same result', () => {
		fc.assert(
			fc.property(updateArb, (input) => {
				fc.pre(sentKeys(input).length > 0);
				const dto = UpdateLinkedInstanceRequestDto.safeParse(input);
				const service = settle(() => parseLinkUpdate(input));

				expect(dto.success).toBe(service.error === undefined);
				if (dto.success) expect(service.value).toEqual(dto.data);
			}),
		);
	});
});
