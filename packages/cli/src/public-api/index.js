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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.loadPublicApiVersions = void 0;
exports.isApiEnabled = isApiEnabled;
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const express_1 = __importDefault(require('express'));
const promises_1 = __importDefault(require('fs/promises'));
const path_1 = __importDefault(require('path'));
const validator_1 = __importDefault(require('validator'));
const yamljs_1 = __importDefault(require('yamljs'));
const license_1 = require('@/license');
const public_api_key_service_1 = require('@/services/public-api-key.service');
const url_service_1 = require('@/services/url.service');
async function createApiRouter(version, openApiSpecPath, handlersDirectory, publicApiEndpoint) {
	const n8nPath = di_1.Container.get(config_1.GlobalConfig).path;
	const swaggerDocument = yamljs_1.default.load(openApiSpecPath);
	swaggerDocument.server = [
		{
			url: `${di_1.Container.get(url_service_1.UrlService).getInstanceBaseUrl()}/${publicApiEndpoint}/${version}}`,
		},
	];
	const apiController = express_1.default.Router();
	if (!di_1.Container.get(config_1.GlobalConfig).publicApi.swaggerUiDisabled) {
		const { serveFiles, setup } = await Promise.resolve().then(() =>
			__importStar(require('swagger-ui-express')),
		);
		const swaggerThemePath = path_1.default.join(__dirname, 'swagger-theme.css');
		const swaggerThemeCss = await promises_1.default.readFile(swaggerThemePath, {
			encoding: 'utf-8',
		});
		apiController.use(
			`/${publicApiEndpoint}/${version}/docs`,
			serveFiles(swaggerDocument),
			setup(swaggerDocument, {
				customCss: swaggerThemeCss,
				customSiteTitle: 'n8n Public API UI',
				customfavIcon: `${n8nPath}favicon.ico`,
			}),
		);
	}
	apiController.get(`/${publicApiEndpoint}/${version}/openapi.yml`, (_, res) => {
		res.sendFile(openApiSpecPath);
	});
	const { middleware: openApiValidatorMiddleware } = await Promise.resolve().then(() =>
		__importStar(require('express-openapi-validator')),
	);
	apiController.use(
		`/${publicApiEndpoint}/${version}`,
		express_1.default.json(),
		openApiValidatorMiddleware({
			apiSpec: openApiSpecPath,
			operationHandlers: handlersDirectory,
			validateRequests: true,
			validateApiSpec: true,
			formats: {
				email: {
					type: 'string',
					validate: (email) => validator_1.default.isEmail(email),
				},
				identifier: {
					type: 'string',
					validate: (identifier) =>
						validator_1.default.isUUID(identifier) || validator_1.default.isEmail(identifier),
				},
				jsonString: {
					validate: (data) => {
						try {
							JSON.parse(data);
							return true;
						} catch (e) {
							return false;
						}
					},
				},
			},
			validateSecurity: {
				handlers: {
					ApiKeyAuth: di_1.Container.get(
						public_api_key_service_1.PublicApiKeyService,
					).getAuthMiddleware(version),
				},
			},
		}),
	);
	apiController.use((error, _req, res, _next) => {
		res.status(error.status || 400).json({
			message: error.message,
		});
	});
	return apiController;
}
const loadPublicApiVersions = async (publicApiEndpoint) => {
	const folders = await promises_1.default.readdir(__dirname);
	const versions = folders.filter((folderName) => folderName.startsWith('v'));
	const apiRouters = await Promise.all(
		versions.map(async (version) => {
			const openApiPath = path_1.default.join(__dirname, version, 'openapi.yml');
			return await createApiRouter(version, openApiPath, __dirname, publicApiEndpoint);
		}),
	);
	const version = versions.pop()?.charAt(1);
	return {
		apiRouters,
		apiLatestVersion: version ? Number(version) : 1,
	};
};
exports.loadPublicApiVersions = loadPublicApiVersions;
function isApiEnabled() {
	return (
		!di_1.Container.get(config_1.GlobalConfig).publicApi.disabled &&
		!di_1.Container.get(license_1.License).isAPIDisabled()
	);
}
//# sourceMappingURL=index.js.map
