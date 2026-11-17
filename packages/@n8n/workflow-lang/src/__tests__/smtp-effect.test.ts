/**
 * The `smtp` effect in the compiler, the reference runner and the bytecode VM:
 * effect kind 8, answered by step name from the fixture.
 */
import { compile } from '../compiler/index.ts';
import { decodeModule } from '../compiler/decode.ts';
import { EFFECT_KIND_NAMES, EffectKind } from '../compiler/opcodes.ts';
import { runReference } from '../reference/runner.ts';
import { runModule } from '../testing/vm.ts';

const wrap = (body: string) => `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ to: string }>({ path: 'p' })],
	credentials: { mail: { type: 'smtp' } },
	async run(ctx, trigger) {
${body}
	},
});
`;

const SEND = wrap(`const out = await ctx.smtp({
			name: 'Send',
			credential: 'mail',
			from: 'a@x.test',
			to: trigger.body.to,
			subject: 'hi',
			text: 'body',
			attachments: [{ filename: 'a.txt', data: 'YQ==' }],
		});
		if ('error' in out) return { failed: out.error.message, code: out.error.code };
		return { accepted: out.accepted, response: out.response, id: out.messageId };`);

const fixture = (result: unknown) => ({
	trigger: { body: { to: 'b@x.test' }, headers: {}, query: {} },
	now: 0,
	seed: 1,
	effects: { Send: [result] },
});

describe('the smtp effect', () => {
	it('has the effect kind 8', () => {
		expect(EffectKind.smtp).toBe(8);
		expect(EFFECT_KIND_NAMES[8]).toBe('smtp');
	});

	it.each([
		[
			'a sent message',
			{
				accepted: ['b@x.test'],
				rejected: [],
				envelopeTime: 3,
				messageTime: 5,
				messageSize: 24,
				response: '250 queued',
				envelope: { from: 'a@x.test', to: ['b@x.test'] },
				messageId: '<1@x.test>',
			},
			{ accepted: ['b@x.test'], response: '250 queued', id: '<1@x.test>' },
		],
		[
			'an error of the server',
			{
				error: {
					message: 'Invalid login: 535 no',
					code: 'EAUTH',
					response: '535 no',
					responseCode: 535,
					command: 'AUTH PLAIN',
				},
			},
			{ failed: 'Invalid login: 535 no', code: 'EAUTH' },
		],
	])(
		'gives %s as data, in the reference runner and in the bytecode',
		async (_name, result, expected) => {
			const compiled = compile(SEND);
			expect(compiled.diagnostics).toEqual([]);
			const reference = await runReference(SEND, fixture(result));
			expect(reference.status).toBe('ok');
			expect(reference.result).toEqual(expected);
			expect(reference.effects).toEqual([
				{
					step: 'Send',
					kind: 'smtp',
					args: {
						name: 'Send',
						credential: 'mail',
						from: 'a@x.test',
						to: 'b@x.test',
						subject: 'hi',
						text: 'body',
						attachments: [{ filename: 'a.txt', data: 'YQ==' }],
					},
				},
			]);
			const bytecode = runModule(
				decodeModule(compiled.module ?? new Uint8Array()),
				fixture(result),
			);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
		},
	);

	it('needs a credential slot', () => {
		const source = wrap(
			"return await ctx.smtp({ name: 'Send', from: '', to: '', text: '' } as never);",
		);
		expect(compile(source).diagnostics.map((d) => d.code)).toContain('WL032');
	});
});
