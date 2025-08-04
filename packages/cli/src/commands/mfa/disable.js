'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.DisableMFACommand = void 0;
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const zod_1 = require('zod');
const base_command_1 = require('../base-command');
const flagsSchema = zod_1.z.object({
	email: zod_1.z.string().describe('The email of the user to disable the MFA authentication'),
});
let DisableMFACommand = class DisableMFACommand extends base_command_1.BaseCommand {
	async run() {
		const { flags } = this;
		if (!flags.email) {
			this.logger.info('An email with --email must be provided');
			return;
		}
		const repository = di_1.Container.get(db_1.UserRepository);
		const user = await repository.findOneBy({ email: flags.email });
		if (!user) {
			this.reportUserDoesNotExistError(flags.email);
			return;
		}
		if (
			user.mfaSecret === null &&
			Array.isArray(user.mfaRecoveryCodes) &&
			user.mfaRecoveryCodes.length === 0 &&
			!user.mfaEnabled
		) {
			this.reportUserDoesNotExistError(flags.email);
			return;
		}
		Object.assign(user, { mfaSecret: null, mfaRecoveryCodes: [], mfaEnabled: false });
		await repository.save(user);
		this.reportSuccess(flags.email);
	}
	async catch(error) {
		this.logger.error('An error occurred while disabling MFA in account');
		this.logger.error(error.message);
	}
	reportSuccess(email) {
		this.logger.info(`Successfully disabled MFA for user with email: ${email}`);
	}
	reportUserDoesNotExistError(email) {
		this.logger.info(`User with email: ${email} does not exist`);
	}
};
exports.DisableMFACommand = DisableMFACommand;
exports.DisableMFACommand = DisableMFACommand = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'mfa:disable',
			description: 'Disable MFA authentication for a user',
			examples: ['--email=johndoe@example.com'],
			flagsSchema,
		}),
	],
	DisableMFACommand,
);
//# sourceMappingURL=disable.js.map
