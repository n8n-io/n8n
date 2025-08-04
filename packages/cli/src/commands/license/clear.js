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
exports.ClearLicenseCommand = void 0;
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const license_1 = require('@/license');
const base_command_1 = require('../base-command');
let ClearLicenseCommand = class ClearLicenseCommand extends base_command_1.BaseCommand {
	async run() {
		this.logger.info('Clearing license from database.');
		const license = di_1.Container.get(license_1.License);
		await license.init({ isCli: true });
		await license.clear();
		this.logger.info('Done. Restart n8n to take effect.');
	}
	async catch(error) {
		this.logger.error('Error. See log messages for details.');
		this.logger.error('\nGOT ERROR');
		this.logger.info('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack);
	}
};
exports.ClearLicenseCommand = ClearLicenseCommand;
exports.ClearLicenseCommand = ClearLicenseCommand = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'license:clear',
			description: 'Clear local license certificate',
		}),
	],
	ClearLicenseCommand,
);
//# sourceMappingURL=clear.js.map
