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
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.CredentialsOverwrites = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const credential_types_1 = require('@/credential-types');
let CredentialsOverwrites = class CredentialsOverwrites {
	constructor(globalConfig, credentialTypes, logger) {
		this.credentialTypes = credentialTypes;
		this.logger = logger;
		this.overwriteData = {};
		this.resolvedTypes = [];
		const data = globalConfig.credentials.overwrite.data;
		const overwriteData = (0, n8n_workflow_1.jsonParse)(data, {
			errorMessage: 'The credentials-overwrite is not valid JSON.',
		});
		this.setData(overwriteData);
	}
	setData(overwriteData) {
		this.resolvedTypes.length = 0;
		this.overwriteData = overwriteData;
		for (const type in overwriteData) {
			const overwrites = this.getOverwrites(type);
			if (overwrites && Object.keys(overwrites).length) {
				this.overwriteData[type] = overwrites;
			}
		}
	}
	applyOverwrite(type, data) {
		const overwrites = this.get(type);
		if (overwrites === undefined) {
			return data;
		}
		const returnData = (0, n8n_workflow_1.deepCopy)(data);
		for (const key of Object.keys(overwrites)) {
			if ([null, undefined, ''].includes(returnData[key])) {
				returnData[key] = overwrites[key];
			}
		}
		return returnData;
	}
	getOverwrites(type) {
		if (this.resolvedTypes.includes(type)) {
			return this.overwriteData[type];
		}
		if (!this.credentialTypes.recognizes(type)) {
			this.logger.warn(`Unknown credential type ${type} in Credential overwrites`);
			return;
		}
		const credentialTypeData = this.credentialTypes.getByName(type);
		if (credentialTypeData.extends === undefined) {
			this.resolvedTypes.push(type);
			return this.overwriteData[type];
		}
		const overwrites = {};
		for (const credentialsTypeName of credentialTypeData.extends) {
			Object.assign(overwrites, this.getOverwrites(credentialsTypeName));
		}
		if (this.overwriteData[type] !== undefined) {
			Object.assign(overwrites, this.overwriteData[type]);
		}
		this.resolvedTypes.push(type);
		return overwrites;
	}
	get(name) {
		const parentTypes = this.credentialTypes.getParentTypes(name);
		return [name, ...parentTypes]
			.reverse()
			.map((type) => this.overwriteData[type])
			.filter((type) => !!type)
			.reduce((acc, current) => Object.assign(acc, current), {});
	}
	getAll() {
		return this.overwriteData;
	}
};
exports.CredentialsOverwrites = CredentialsOverwrites;
exports.CredentialsOverwrites = CredentialsOverwrites = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			config_1.GlobalConfig,
			credential_types_1.CredentialTypes,
			backend_common_1.Logger,
		]),
	],
	CredentialsOverwrites,
);
//# sourceMappingURL=credentials-overwrites.js.map
