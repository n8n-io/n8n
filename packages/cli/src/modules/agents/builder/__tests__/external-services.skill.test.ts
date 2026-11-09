import { externalServicesSkill } from '../skills/external-services.skill';

describe('externalServicesSkill', () => {
	it('encodes MCP tool exposure restrictions as an allowlist', () => {
		const instructions = externalServicesSkill().instructions;

		expect(instructions).toContain(
			'Omit `toolPermissions` unless the user explicitly asks to require approval,\n' +
				'  block a tool or category, or restrict which tools are exposed.',
		);
		expect(instructions).toContain(
			'Treat requests to expose or allow only named tools as an allowlist.',
		);
		expect(instructions).toContain(
			'`toolPermissions.categories.write` to `"blocked"`, then add each selected\n' +
				'  tool to `toolPermissions.tools` as an `"always_allow"` override.',
		);
	});
});
