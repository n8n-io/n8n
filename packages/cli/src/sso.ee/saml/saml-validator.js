'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
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
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.SamlValidator = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const samlify_1 = require('samlify');
const invalid_saml_metadata_error_1 = require('./errors/invalid-saml-metadata.error');
let SamlValidator = class SamlValidator {
	constructor(logger) {
		this.logger = logger;
		this.preload = [];
	}
	async init() {
		await this.loadSchemas();
		this.xmllint = await Promise.resolve().then(() => __importStar(require('xmllint-wasm')));
	}
	validateIdentiyProvider(idp) {
		const binding = idp.entityMeta.getSingleSignOnService(
			samlify_1.Constants.wording.binding.redirect,
		);
		if (typeof binding !== 'string') {
			throw new invalid_saml_metadata_error_1.InvalidSamlMetadataError(
				'only SAML redirect binding is supported.',
			);
		}
	}
	async validateMetadata(metadata) {
		const validXML = await this.validateXml('metadata', metadata);
		if (validXML) {
			const idp = (0, samlify_1.IdentityProvider)({
				metadata,
			});
			this.validateIdentiyProvider(idp);
		}
		return validXML;
	}
	async validateResponse(response) {
		return await this.validateXml('response', response);
	}
	async loadSchemas() {
		this.xmlProtocol = (
			await Promise.resolve().then(() =>
				__importStar(require('./schema/saml-schema-protocol-2.0.xsd')),
			)
		).xmlFileInfo;
		this.xmlMetadata = (
			await Promise.resolve().then(() =>
				__importStar(require('./schema/saml-schema-metadata-2.0.xsd')),
			)
		).xmlFileInfo;
		this.preload = (
			await Promise.all([
				Promise.resolve().then(() =>
					__importStar(require('./schema/saml-schema-assertion-2.0.xsd')),
				),
				Promise.resolve().then(() => __importStar(require('./schema/xmldsig-core-schema.xsd'))),
				Promise.resolve().then(() => __importStar(require('./schema/xenc-schema.xsd'))),
				Promise.resolve().then(() => __importStar(require('./schema/xml.xsd'))),
				Promise.resolve().then(() => __importStar(require('./schema/ws-federation.xsd'))),
				Promise.resolve().then(() =>
					__importStar(require('./schema/oasis-200401-wss-wssecurity-secext-1.0.xsd')),
				),
				Promise.resolve().then(() =>
					__importStar(require('./schema/oasis-200401-wss-wssecurity-utility-1.0.xsd')),
				),
				Promise.resolve().then(() => __importStar(require('./schema/ws-addr.xsd'))),
				Promise.resolve().then(() => __importStar(require('./schema/metadata-exchange.xsd'))),
				Promise.resolve().then(() => __importStar(require('./schema/ws-securitypolicy-1.2.xsd'))),
				Promise.resolve().then(() => __importStar(require('./schema/ws-authorization.xsd'))),
			])
		).map((m) => m.xmlFileInfo);
	}
	async validateXml(type, contents) {
		const fileName = `${type}.xml`;
		const schema = type === 'metadata' ? [this.xmlMetadata] : [this.xmlProtocol];
		const preload = [type === 'metadata' ? this.xmlProtocol : this.xmlMetadata, ...this.preload];
		try {
			const validationResult = await this.xmllint.validateXML({
				xml: [{ fileName, contents }],
				extension: 'schema',
				schema,
				preload,
			});
			if (validationResult?.valid) {
				this.logger.debug(`SAML ${type} is valid`);
				return true;
			} else {
				this.logger.debug(`SAML ${type} is invalid`);
				this.logger.warn(
					validationResult
						? validationResult.errors
								.map((error) => `${error.message} - ${error.rawMessage}`)
								.join('\n')
						: '',
				);
			}
		} catch (error) {
			this.logger.warn(error);
		}
		return false;
	}
};
exports.SamlValidator = SamlValidator;
exports.SamlValidator = SamlValidator = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [backend_common_1.Logger])],
	SamlValidator,
);
//# sourceMappingURL=saml-validator.js.map
