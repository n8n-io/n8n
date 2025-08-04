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
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const axios_1 = __importDefault(require('axios'));
const jest_mock_extended_1 = require('jest-mock-extended');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const samlHelpers = __importStar(require('@/sso.ee/saml/saml-helpers'));
const saml_service_ee_1 = require('@/sso.ee/saml/saml.service.ee');
const constants_1 = require('../constants');
const invalid_saml_metadata_url_error_1 = require('../errors/invalid-saml-metadata-url.error');
const invalid_saml_metadata_error_1 = require('../errors/invalid-saml-metadata.error');
const saml_validator_1 = require('../saml-validator');
jest.mock('axios');
const mockedAxios = axios_1.default;
const InvalidSamlSetting = {
	loadOnStartup: true,
	key: constants_1.SAML_PREFERENCES_DB_KEY,
	value: JSON.stringify({
		mapping: {
			email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
			firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname',
			lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname',
			userPrincipalName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
		},
		metadata:
			'r xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://saml.example.com/entityid" validUntil="2035-05-07T13:33:47.181Z">\n  <md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">\n    <md:KeyDescriptor use="signing">\n      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">\n        <ds:X509Data>\n          <ds:X509Certificate>MIIC4jCCAcoCCQC33wnybT5QZDANBgkqhkiG9w0BAQsFADAyMQswCQYDVQQGEwJV\nSzEPMA0GA1UECgwGQm94eUhRMRIwEAYDVQQDDAlNb2NrIFNBTUwwIBcNMjIwMjI4\nMjE0NjM4WhgPMzAyMTA3MDEyMTQ2MzhaMDIxCzAJBgNVBAYTAlVLMQ8wDQYDVQQK\nDAZCb3h5SFExEjAQBgNVBAMMCU1vY2sgU0FNTDCCASIwDQYJKoZIhvcNAQEBBQAD\nggEPADCCAQoCggEBALGfYettMsct1T6tVUwTudNJH5Pnb9GGnkXi9Zw/e6x45DD0\nRuRONbFlJ2T4RjAE/uG+AjXxXQ8o2SZfb9+GgmCHuTJFNgHoZ1nFVXCmb/Hg8Hpd\n4vOAGXndixaReOiq3EH5XvpMjMkJ3+8+9VYMzMZOjkgQtAqO36eAFFfNKX7dTj3V\npwLkvz6/KFCq8OAwY+AUi4eZm5J57D31GzjHwfjH9WTeX0MyndmnNB1qV75qQR3b\n2/W5sGHRv+9AarggJkF+ptUkXoLtVA51wcfYm6hILptpde5FQC8RWY1YrswBWAEZ\nNfyrR4JeSweElNHg4NVOs4TwGjOPwWGqzTfgTlECAwEAATANBgkqhkiG9w0BAQsF\nAAOCAQEAAYRlYflSXAWoZpFfwNiCQVE5d9zZ0DPzNdWhAybXcTyMf0z5mDf6FWBW\n5Gyoi9u3EMEDnzLcJNkwJAAc39Apa4I2/tml+Jy29dk8bTyX6m93ngmCgdLh5Za4\nkhuU3AM3L63g7VexCuO7kwkjh/+LqdcIXsVGO6XDfu2QOs1Xpe9zIzLpwm/RNYeX\nUjbSj5ce/jekpAw7qyVVL4xOyh8AtUW1ek3wIw1MJvEgEPt0d16oshWJpoS1OT8L\nr/22SvYEo3EmSGdTVGgk3x3s+A0qWAqTcyjr7Q4s/GKYRFfomGwz0TZ4Iw1ZN99M\nm0eo2USlSRTVl7QHRTuiuSThHpLKQQ==</ds:X509Certificate>\n        </ds:X509Data>\n      </ds:KeyInfo>\n    </md:KeyDescriptor>\n    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://mocksaml.com/api/saml/sso"/>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://mocksaml.com/api/saml/sso"/>\n  </md:IDPSSODescriptor>\n</md:EntityDescriptor>',
		metadataUrl:
			'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://saml.example.com/entityid" validUntil="2035-05-07T13:33:47.181Z">\n  <md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">\n    <md:KeyDescriptor use="signing">\n      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">\n        <ds:X509Data>\n          <ds:X509Certificate>MIIC4jCCAcoCCQC33wnybT5QZDANBgkqhkiG9w0BAQsFADAyMQswCQYDVQQGEwJV\nSzEPMA0GA1UECgwGQm94eUhRMRIwEAYDVQQDDAlNb2NrIFNBTUwwIBcNMjIwMjI4\nMjE0NjM4WhgPMzAyMTA3MDEyMTQ2MzhaMDIxCzAJBgNVBAYTAlVLMQ8wDQYDVQQK\nDAZCb3h5SFExEjAQBgNVBAMMCU1vY2sgU0FNTDCCASIwDQYJKoZIhvcNAQEBBQAD\nggEPADCCAQoCggEBALGfYettMsct1T6tVUwTudNJH5Pnb9GGnkXi9Zw/e6x45DD0\nRuRONbFlJ2T4RjAE/uG+AjXxXQ8o2SZfb9+GgmCHuTJFNgHoZ1nFVXCmb/Hg8Hpd\n4vOAGXndixaReOiq3EH5XvpMjMkJ3+8+9VYMzMZOjkgQtAqO36eAFFfNKX7dTj3V\npwLkvz6/KFCq8OAwY+AUi4eZm5J57D31GzjHwfjH9WTeX0MyndmnNB1qV75qQR3b\n2/W5sGHRv+9AarggJkF+ptUkXoLtVA51wcfYm6hILptpde5FQC8RWY1YrswBWAEZ\nNfyrR4JeSweElNHg4NVOs4TwGjOPwWGqzTfgTlECAwEAATANBgkqhkiG9w0BAQsF\nAAOCAQEAAYRlYflSXAWoZpFfwNiCQVE5d9zZ0DPzNdWhAybXcTyMf0z5mDf6FWBW\n5Gyoi9u3EMEDnzLcJNkwJAAc39Apa4I2/tml+Jy29dk8bTyX6m93ngmCgdLh5Za4\nkhuU3AM3L63g7VexCuO7kwkjh/+LqdcIXsVGO6XDfu2QOs1Xpe9zIzLpwm/RNYeX\nUjbSj5ce/jekpAw7qyVVL4xOyh8AtUW1ek3wIw1MJvEgEPt0d16oshWJpoS1OT8L\nr/22SvYEo3EmSGdTVGgk3x3s+A0qWAqTcyjr7Q4s/GKYRFfomGwz0TZ4Iw1ZN99M\nm0eo2USlSRTVl7QHRTuiuSThHpLKQQ==</ds:X509Certificate>\n        </ds:X509Data>\n      </ds:KeyInfo>\n    </md:KeyDescriptor>\n    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://mocksaml.com/api/saml/sso"/>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://mocksaml.com/api/saml/sso"/>\n  </md:IDPSSODescriptor>\n</md:EntityDescriptor>',
		ignoreSSL: false,
		loginBinding: 'redirect',
		acsBinding: 'post',
		authnRequestsSigned: false,
		loginEnabled: true,
		loginLabel: '',
		wantAssertionsSigned: true,
		wantMessageSigned: true,
		relayState: 'http://localhost:5678',
		signatureConfig: {
			prefix: 'ds',
			location: { reference: '/samlp:Response/saml:Issuer', action: 'after' },
		},
	}),
};
const SamlMetadataWithoutRedirectBinding =
	'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://saml.example.com/entityid" validUntil="2035-05-07T13:33:47.181Z">\n  <md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">\n    <md:KeyDescriptor use="signing">\n      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">\n        <ds:X509Data>\n          <ds:X509Certificate>MIIC4jCCAcoCCQC33wnybT5QZDANBgkqhkiG9w0BAQsFADAyMQswCQYDVQQGEwJV\nSzEPMA0GA1UECgwGQm94eUhRMRIwEAYDVQQDDAlNb2NrIFNBTUwwIBcNMjIwMjI4\nMjE0NjM4WhgPMzAyMTA3MDEyMTQ2MzhaMDIxCzAJBgNVBAYTAlVLMQ8wDQYDVQQK\nDAZCb3h5SFExEjAQBgNVBAMMCU1vY2sgU0FNTDCCASIwDQYJKoZIhvcNAQEBBQAD\nggEPADCCAQoCggEBALGfYettMsct1T6tVUwTudNJH5Pnb9GGnkXi9Zw/e6x45DD0\nRuRONbFlJ2T4RjAE/uG+AjXxXQ8o2SZfb9+GgmCHuTJFNgHoZ1nFVXCmb/Hg8Hpd\n4vOAGXndixaReOiq3EH5XvpMjMkJ3+8+9VYMzMZOjkgQtAqO36eAFFfNKX7dTj3V\npwLkvz6/KFCq8OAwY+AUi4eZm5J57D31GzjHwfjH9WTeX0MyndmnNB1qV75qQR3b\n2/W5sGHRv+9AarggJkF+ptUkXoLtVA51wcfYm6hILptpde5FQC8RWY1YrswBWAEZ\nNfyrR4JeSweElNHg4NVOs4TwGjOPwWGqzTfgTlECAwEAATANBgkqhkiG9w0BAQsF\nAAOCAQEAAYRlYflSXAWoZpFfwNiCQVE5d9zZ0DPzNdWhAybXcTyMf0z5mDf6FWBW\n5Gyoi9u3EMEDnzLcJNkwJAAc39Apa4I2/tml+Jy29dk8bTyX6m93ngmCgdLh5Za4\nkhuU3AM3L63g7VexCuO7kwkjh/+LqdcIXsVGO6XDfu2QOs1Xpe9zIzLpwm/RNYeX\nUjbSj5ce/jekpAw7qyVVL4xOyh8AtUW1ek3wIw1MJvEgEPt0d16oshWJpoS1OT8L\nr/22SvYEo3EmSGdTVGgk3x3s+A0qWAqTcyjr7Q4s/GKYRFfomGwz0TZ4Iw1ZN99M\nm0eo2USlSRTVl7QHRTuiuSThHpLKQQ==</ds:X509Certificate>\n        </ds:X509Data>\n      </ds:KeyInfo>\n    </md:KeyDescriptor>\n    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://mocksaml.com/api/saml/sso"/>\n  </md:IDPSSODescriptor>\n</md:EntityDescriptor>';
const SamlSettingWithInvalidUrl = {
	loadOnStartup: true,
	key: constants_1.SAML_PREFERENCES_DB_KEY,
	value: JSON.stringify({
		mapping: {
			email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
			firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname',
			lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname',
			userPrincipalName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
		},
		metadata:
			'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://saml.example.com/entityid" validUntil="2035-05-07T13:33:47.181Z">\n  <md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">\n    <md:KeyDescriptor use="signing">\n      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">\n        <ds:X509Data>\n          <ds:X509Certificate>MIIC4jCCAcoCCQC33wnybT5QZDANBgkqhkiG9w0BAQsFADAyMQswCQYDVQQGEwJV\nSzEPMA0GA1UECgwGQm94eUhRMRIwEAYDVQQDDAlNb2NrIFNBTUwwIBcNMjIwMjI4\nMjE0NjM4WhgPMzAyMTA3MDEyMTQ2MzhaMDIxCzAJBgNVBAYTAlVLMQ8wDQYDVQQK\nDAZCb3h5SFExEjAQBgNVBAMMCU1vY2sgU0FNTDCCASIwDQYJKoZIhvcNAQEBBQAD\nggEPADCCAQoCggEBALGfYettMsct1T6tVUwTudNJH5Pnb9GGnkXi9Zw/e6x45DD0\nRuRONbFlJ2T4RjAE/uG+AjXxXQ8o2SZfb9+GgmCHuTJFNgHoZ1nFVXCmb/Hg8Hpd\n4vOAGXndixaReOiq3EH5XvpMjMkJ3+8+9VYMzMZOjkgQtAqO36eAFFfNKX7dTj3V\npwLkvz6/KFCq8OAwY+AUi4eZm5J57D31GzjHwfjH9WTeX0MyndmnNB1qV75qQR3b\n2/W5sGHRv+9AarggJkF+ptUkXoLtVA51wcfYm6hILptpde5FQC8RWY1YrswBWAEZ\nNfyrR4JeSweElNHg4NVOs4TwGjOPwWGqzTfgTlECAwEAATANBgkqhkiG9w0BAQsF\nAAOCAQEAAYRlYflSXAWoZpFfwNiCQVE5d9zZ0DPzNdWhAybXcTyMf0z5mDf6FWBW\n5Gyoi9u3EMEDnzLcJNkwJAAc39Apa4I2/tml+Jy29dk8bTyX6m93ngmCgdLh5Za4\nkhuU3AM3L63g7VexCuO7kwkjh/+LqdcIXsVGO6XDfu2QOs1Xpe9zIzLpwm/RNYeX\nUjbSj5ce/jekpAw7qyVVL4xOyh8AtUW1ek3wIw1MJvEgEPt0d16oshWJpoS1OT8L\nr/22SvYEo3EmSGdTVGgk3x3s+A0qWAqTcyjr7Q4s/GKYRFfomGwz0TZ4Iw1ZN99M\nm0eo2USlSRTVl7QHRTuiuSThHpLKQQ==</ds:X509Certificate>\n        </ds:X509Data>\n      </ds:KeyInfo>\n    </md:KeyDescriptor>\n    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://mocksaml.com/api/saml/sso"/>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://mocksaml.com/api/saml/sso"/>\n  </md:IDPSSODescriptor>\n</md:EntityDescriptor>',
		metadataUrl:
			'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://saml.example.com/entityid" validUntil="2035-05-07T13:33:47.181Z">\n  <md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">\n    <md:KeyDescriptor use="signing">\n      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">\n        <ds:X509Data>\n          <ds:X509Certificate>MIIC4jCCAcoCCQC33wnybT5QZDANBgkqhkiG9w0BAQsFADAyMQswCQYDVQQGEwJV\nSzEPMA0GA1UECgwGQm94eUhRMRIwEAYDVQQDDAlNb2NrIFNBTUwwIBcNMjIwMjI4\nMjE0NjM4WhgPMzAyMTA3MDEyMTQ2MzhaMDIxCzAJBgNVBAYTAlVLMQ8wDQYDVQQK\nDAZCb3h5SFExEjAQBgNVBAMMCU1vY2sgU0FNTDCCASIwDQYJKoZIhvcNAQEBBQAD\nggEPADCCAQoCggEBALGfYettMsct1T6tVUwTudNJH5Pnb9GGnkXi9Zw/e6x45DD0\nRuRONbFlJ2T4RjAE/uG+AjXxXQ8o2SZfb9+GgmCHuTJFNgHoZ1nFVXCmb/Hg8Hpd\n4vOAGXndixaReOiq3EH5XvpMjMkJ3+8+9VYMzMZOjkgQtAqO36eAFFfNKX7dTj3V\npwLkvz6/KFCq8OAwY+AUi4eZm5J57D31GzjHwfjH9WTeX0MyndmnNB1qV75qQR3b\n2/W5sGHRv+9AarggJkF+ptUkXoLtVA51wcfYm6hILptpde5FQC8RWY1YrswBWAEZ\nNfyrR4JeSweElNHg4NVOs4TwGjOPwWGqzTfgTlECAwEAATANBgkqhkiG9w0BAQsF\nAAOCAQEAAYRlYflSXAWoZpFfwNiCQVE5d9zZ0DPzNdWhAybXcTyMf0z5mDf6FWBW\n5Gyoi9u3EMEDnzLcJNkwJAAc39Apa4I2/tml+Jy29dk8bTyX6m93ngmCgdLh5Za4\nkhuU3AM3L63g7VexCuO7kwkjh/+LqdcIXsVGO6XDfu2QOs1Xpe9zIzLpwm/RNYeX\nUjbSj5ce/jekpAw7qyVVL4xOyh8AtUW1ek3wIw1MJvEgEPt0d16oshWJpoS1OT8L\nr/22SvYEo3EmSGdTVGgk3x3s+A0qWAqTcyjr7Q4s/GKYRFfomGwz0TZ4Iw1ZN99M\nm0eo2USlSRTVl7QHRTuiuSThHpLKQQ==</ds:X509Certificate>\n        </ds:X509Data>\n      </ds:KeyInfo>\n    </md:KeyDescriptor>\n    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://mocksaml.com/api/saml/sso"/>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://mocksaml.com/api/saml/sso"/>\n  </md:IDPSSODescriptor>\n</md:EntityDescriptor>',
		ignoreSSL: false,
		loginBinding: 'redirect',
		acsBinding: 'post',
		authnRequestsSigned: false,
		loginEnabled: true,
		loginLabel: '',
		wantAssertionsSigned: true,
		wantMessageSigned: true,
		relayState: 'http://localhost:5678',
		signatureConfig: {
			prefix: 'ds',
			location: { reference: '/samlp:Response/saml:Issuer', action: 'after' },
		},
	}),
};
const SamlSettingWithInvalidUrlAndInvalidMetadataXML = {
	loadOnStartup: true,
	key: constants_1.SAML_PREFERENCES_DB_KEY,
	value: JSON.stringify({
		mapping: {
			email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
			firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname',
			lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname',
			userPrincipalName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
		},
		metadataUrl:
			'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://saml.example.com/entityid" validUntil="2035-05-07T13:33:47.181Z">\n  <md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">\n    <md:KeyDescriptor use="signing">\n      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">\n        <ds:X509Data>\n          <ds:X509Certificate>MIIC4jCCAcoCCQC33wnybT5QZDANBgkqhkiG9w0BAQsFADAyMQswCQYDVQQGEwJV\nSzEPMA0GA1UECgwGQm94eUhRMRIwEAYDVQQDDAlNb2NrIFNBTUwwIBcNMjIwMjI4\nMjE0NjM4WhgPMzAyMTA3MDEyMTQ2MzhaMDIxCzAJBgNVBAYTAlVLMQ8wDQYDVQQK\nDAZCb3h5SFExEjAQBgNVBAMMCU1vY2sgU0FNTDCCASIwDQYJKoZIhvcNAQEBBQAD\nggEPADCCAQoCggEBALGfYettMsct1T6tVUwTudNJH5Pnb9GGnkXi9Zw/e6x45DD0\nRuRONbFlJ2T4RjAE/uG+AjXxXQ8o2SZfb9+GgmCHuTJFNgHoZ1nFVXCmb/Hg8Hpd\n4vOAGXndixaReOiq3EH5XvpMjMkJ3+8+9VYMzMZOjkgQtAqO36eAFFfNKX7dTj3V\npwLkvz6/KFCq8OAwY+AUi4eZm5J57D31GzjHwfjH9WTeX0MyndmnNB1qV75qQR3b\n2/W5sGHRv+9AarggJkF+ptUkXoLtVA51wcfYm6hILptpde5FQC8RWY1YrswBWAEZ\nNfyrR4JeSweElNHg4NVOs4TwGjOPwWGqzTfgTlECAwEAATANBgkqhkiG9w0BAQsF\nAAOCAQEAAYRlYflSXAWoZpFfwNiCQVE5d9zZ0DPzNdWhAybXcTyMf0z5mDf6FWBW\n5Gyoi9u3EMEDnzLcJNkwJAAc39Apa4I2/tml+Jy29dk8bTyX6m93ngmCgdLh5Za4\nkhuU3AM3L63g7VexCuO7kwkjh/+LqdcIXsVGO6XDfu2QOs1Xpe9zIzLpwm/RNYeX\nUjbSj5ce/jekpAw7qyVVL4xOyh8AtUW1ek3wIw1MJvEgEPt0d16oshWJpoS1OT8L\nr/22SvYEo3EmSGdTVGgk3x3s+A0qWAqTcyjr7Q4s/GKYRFfomGwz0TZ4Iw1ZN99M\nm0eo2USlSRTVl7QHRTuiuSThHpLKQQ==</ds:X509Certificate>\n        </ds:X509Data>\n      </ds:KeyInfo>\n    </md:KeyDescriptor>\n    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://mocksaml.com/api/saml/sso"/>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://mocksaml.com/api/saml/sso"/>\n  </md:IDPSSODescriptor>\n</md:EntityDescriptor>',
		ignoreSSL: false,
		loginBinding: 'redirect',
		acsBinding: 'post',
		authnRequestsSigned: false,
		loginEnabled: true,
		loginLabel: '',
		wantAssertionsSigned: true,
		wantMessageSigned: true,
		relayState: 'http://localhost:5678',
		signatureConfig: {
			prefix: 'ds',
			location: { reference: '/samlp:Response/saml:Issuer', action: 'after' },
		},
	}),
};
const SamlSettingWithValidUrl = {
	loadOnStartup: true,
	key: constants_1.SAML_PREFERENCES_DB_KEY,
	value: JSON.stringify({
		mapping: {
			email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
			firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname',
			lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname',
			userPrincipalName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
		},
		metadataUrl: 'https://valid_url.mocked.in.test',
		ignoreSSL: false,
		loginBinding: 'redirect',
		acsBinding: 'post',
		authnRequestsSigned: false,
		loginEnabled: true,
		loginLabel: '',
		wantAssertionsSigned: true,
		wantMessageSigned: true,
		relayState: 'http://localhost:5678',
		signatureConfig: {
			prefix: 'ds',
			location: { reference: '/samlp:Response/saml:Issuer', action: 'after' },
		},
	}),
};
describe('SamlService', () => {
	const validator = new saml_validator_1.SamlValidator((0, jest_mock_extended_1.mock)());
	const settingsRepository = (0, backend_test_utils_1.mockInstance)(db_1.SettingsRepository);
	const samlService = new saml_service_ee_1.SamlService(
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		validator,
		(0, jest_mock_extended_1.mock)(),
		settingsRepository,
	);
	beforeAll(async () => {
		await validator.init();
	});
	beforeEach(() => {
		jest.restoreAllMocks();
	});
	describe('getAttributesFromLoginResponse', () => {
		test('throws when any attribute is missing', async () => {
			jest
				.spyOn(samlService, 'getIdentityProviderInstance')
				.mockReturnValue((0, jest_mock_extended_1.mock)());
			const serviceProviderInstance = (0, jest_mock_extended_1.mock)();
			serviceProviderInstance.parseLoginResponse.mockResolvedValue({
				samlContent: '',
				extract: {},
			});
			jest
				.spyOn(samlService, 'getServiceProviderInstance')
				.mockReturnValue(serviceProviderInstance);
			jest.spyOn(samlHelpers, 'getMappedSamlAttributesFromFlowResult').mockReturnValue({
				attributes: {},
				missingAttributes: [
					'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
					'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname',
					'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname',
					'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
				],
			});
			await expect(
				samlService.getAttributesFromLoginResponse((0, jest_mock_extended_1.mock)(), 'post'),
			).rejects.toThrowError(
				'SAML Authentication failed. Invalid SAML response (missing attributes: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress, http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname, http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname, http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn).',
			);
		});
	});
	describe('init', () => {
		test('calls `reset` if an InvalidSamlMetadataUrlError is thrown', async () => {
			jest
				.spyOn(samlService, 'loadFromDbAndApplySamlPreferences')
				.mockRejectedValue(
					new invalid_saml_metadata_url_error_1.InvalidSamlMetadataUrlError(
						'https://www.google.com',
					),
				);
			jest.spyOn(samlService, 'reset');
			await samlService.init();
			expect(samlService.reset).toHaveBeenCalledTimes(1);
		});
		test('calls `reset` if an InvalidSamlMetadataError is thrown', async () => {
			jest
				.spyOn(samlService, 'loadFromDbAndApplySamlPreferences')
				.mockRejectedValue(new invalid_saml_metadata_error_1.InvalidSamlMetadataError());
			jest.spyOn(samlService, 'reset');
			await samlService.init();
			expect(samlService.reset).toHaveBeenCalledTimes(1);
		});
		test('calls `reset` if a SyntaxError is thrown', async () => {
			jest
				.spyOn(samlService, 'loadFromDbAndApplySamlPreferences')
				.mockRejectedValue(new SyntaxError());
			jest.spyOn(samlService, 'reset');
			await samlService.init();
			expect(samlService.reset).toHaveBeenCalledTimes(1);
		});
		test('does not call reset and rethrows if another error is thrown', async () => {
			jest
				.spyOn(samlService, 'loadFromDbAndApplySamlPreferences')
				.mockRejectedValue(new TypeError());
			jest.spyOn(samlService, 'reset');
			await expect(samlService.init()).rejects.toThrowError(TypeError);
			expect(samlService.reset).toHaveBeenCalledTimes(0);
		});
		test('does not call reset if no error is thrown', async () => {
			jest.spyOn(samlService, 'reset');
			await samlService.init();
			expect(samlService.reset).toHaveBeenCalledTimes(0);
		});
	});
	describe('loadFromDbAndApplySamlPreferences', () => {
		test('does throw `InvalidSamlMetadataError` when no valid SAML metadata could have been loaded', async () => {
			jest.spyOn(settingsRepository, 'findOne').mockResolvedValue(InvalidSamlSetting);
			await expect(samlService.loadFromDbAndApplySamlPreferences(true)).rejects.toThrowError(
				invalid_saml_metadata_error_1.InvalidSamlMetadataError,
			);
		});
		test('does throw `InvalidSamlMetadataError` when invalid SAML url and no saml metadata is available', async () => {
			jest
				.spyOn(settingsRepository, 'findOne')
				.mockResolvedValue(SamlSettingWithInvalidUrlAndInvalidMetadataXML);
			await expect(samlService.loadFromDbAndApplySamlPreferences(true)).rejects.toThrowError(
				invalid_saml_metadata_error_1.InvalidSamlMetadataError,
			);
		});
		test('does not throw an error when the metadata url is invalid, but valid metadata is available in the database', async () => {
			jest.spyOn(settingsRepository, 'findOne').mockResolvedValue(SamlSettingWithInvalidUrl);
			await samlService.loadFromDbAndApplySamlPreferences(true);
		});
		test('does not throw an error when the metadata url is valid', async () => {
			jest.spyOn(settingsRepository, 'findOne').mockResolvedValue(SamlSettingWithValidUrl);
			jest
				.spyOn(samlService, 'fetchMetadataFromUrl')
				.mockResolvedValue(
					'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://saml.example.com/entityid" validUntil="2035-05-07T13:33:47.181Z">\n  <md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">\n    <md:KeyDescriptor use="signing">\n      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">\n        <ds:X509Data>\n          <ds:X509Certificate>MIIC4jCCAcoCCQC33wnybT5QZDANBgkqhkiG9w0BAQsFADAyMQswCQYDVQQGEwJV\nSzEPMA0GA1UECgwGQm94eUhRMRIwEAYDVQQDDAlNb2NrIFNBTUwwIBcNMjIwMjI4\nMjE0NjM4WhgPMzAyMTA3MDEyMTQ2MzhaMDIxCzAJBgNVBAYTAlVLMQ8wDQYDVQQK\nDAZCb3h5SFExEjAQBgNVBAMMCU1vY2sgU0FNTDCCASIwDQYJKoZIhvcNAQEBBQAD\nggEPADCCAQoCggEBALGfYettMsct1T6tVUwTudNJH5Pnb9GGnkXi9Zw/e6x45DD0\nRuRONbFlJ2T4RjAE/uG+AjXxXQ8o2SZfb9+GgmCHuTJFNgHoZ1nFVXCmb/Hg8Hpd\n4vOAGXndixaReOiq3EH5XvpMjMkJ3+8+9VYMzMZOjkgQtAqO36eAFFfNKX7dTj3V\npwLkvz6/KFCq8OAwY+AUi4eZm5J57D31GzjHwfjH9WTeX0MyndmnNB1qV75qQR3b\n2/W5sGHRv+9AarggJkF+ptUkXoLtVA51wcfYm6hILptpde5FQC8RWY1YrswBWAEZ\nNfyrR4JeSweElNHg4NVOs4TwGjOPwWGqzTfgTlECAwEAATANBgkqhkiG9w0BAQsF\nAAOCAQEAAYRlYflSXAWoZpFfwNiCQVE5d9zZ0DPzNdWhAybXcTyMf0z5mDf6FWBW\n5Gyoi9u3EMEDnzLcJNkwJAAc39Apa4I2/tml+Jy29dk8bTyX6m93ngmCgdLh5Za4\nkhuU3AM3L63g7VexCuO7kwkjh/+LqdcIXsVGO6XDfu2QOs1Xpe9zIzLpwm/RNYeX\nUjbSj5ce/jekpAw7qyVVL4xOyh8AtUW1ek3wIw1MJvEgEPt0d16oshWJpoS1OT8L\nr/22SvYEo3EmSGdTVGgk3x3s+A0qWAqTcyjr7Q4s/GKYRFfomGwz0TZ4Iw1ZN99M\nm0eo2USlSRTVl7QHRTuiuSThHpLKQQ==</ds:X509Certificate>\n        </ds:X509Data>\n      </ds:KeyInfo>\n    </md:KeyDescriptor>\n    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://mocksaml.com/api/saml/sso"/>\n    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://mocksaml.com/api/saml/sso"/>\n  </md:IDPSSODescriptor>\n</md:EntityDescriptor>',
				);
			await samlService.loadFromDbAndApplySamlPreferences(true);
		});
	});
	describe('setSamlPreferences', () => {
		test('does throw `BadRequestError` when a metadata url is not a valid url', async () => {
			await expect(
				samlService.setSamlPreferences({
					metadataUrl: 'NOT A VALID URL',
				}),
			).rejects.toThrowError(bad_request_error_1.BadRequestError);
		});
		test('does not persist an invalid metadata url', async () => {
			const metadataUrlTestData = 'TestDataThatShouldPersist';
			await samlService.loadPreferencesWithoutValidation({
				metadataUrl: metadataUrlTestData,
			});
			await expect(
				samlService.setSamlPreferences({
					metadataUrl: 'NOT A VALID URL',
				}),
			).rejects.toThrowError(bad_request_error_1.BadRequestError);
			expect(samlService.samlPreferences.metadataUrl).toBe(metadataUrlTestData);
		});
		test('does throw `BadRequestError` when a metadata url is not returning correct metadata', async () => {
			mockedAxios.get.mockResolvedValue({ status: 200, data: 'NOT VALID SAML METADATA' });
			await expect(
				samlService.setSamlPreferences({
					metadataUrl: 'https://www.some.url',
				}),
			).rejects.toThrowError(bad_request_error_1.BadRequestError);
		});
		test('does not persist a metadata url, that is not returning correct metadata', async () => {
			const metadataUrlTestData = 'TestDataThatShouldPersist';
			await samlService.loadPreferencesWithoutValidation({
				metadataUrl: metadataUrlTestData,
			});
			mockedAxios.get.mockResolvedValue({ status: 200, data: 'NOT VALID SAML METADATA' });
			await expect(
				samlService.setSamlPreferences({
					metadataUrl: 'https://www.some.url',
				}),
			).rejects.toThrowError(bad_request_error_1.BadRequestError);
			expect(samlService.samlPreferences.metadataUrl).toBe(metadataUrlTestData);
		});
		test('does throw `InvalidSamlMetadataError` when a metadata does not contain redirect binding', async () => {
			await expect(
				samlService.setSamlPreferences({
					metadata: SamlMetadataWithoutRedirectBinding,
				}),
			).rejects.toThrowError(invalid_saml_metadata_error_1.InvalidSamlMetadataError);
		});
		test('does throw `InvalidSamlMetadataError` when a metadata url is not a valid url', async () => {
			await expect(
				samlService.setSamlPreferences({
					metadata: 'NOT A VALID XML',
				}),
			).rejects.toThrowError(invalid_saml_metadata_error_1.InvalidSamlMetadataError);
		});
		test('does throw `InvalidSamlMetadataUrlError` when the metadata url does not return success on http call', async () => {
			mockedAxios.get.mockResolvedValue({ status: 400, data: '' });
			await expect(
				samlService.setSamlPreferences({
					metadataUrl: 'https://www.some.url',
				}),
			).rejects.toThrowError(invalid_saml_metadata_url_error_1.InvalidSamlMetadataUrlError);
		});
		test('does not persist a metadata url, that is not returning success on http call', async () => {
			const metadataUrlTestData = 'TestDataThatShouldPersist';
			await samlService.loadPreferencesWithoutValidation({
				metadataUrl: metadataUrlTestData,
			});
			mockedAxios.get.mockResolvedValue({ status: 400 });
			await expect(
				samlService.setSamlPreferences({
					metadataUrl: 'https://www.some.url',
				}),
			).rejects.toThrowError(invalid_saml_metadata_url_error_1.InvalidSamlMetadataUrlError);
			expect(samlService.samlPreferences.metadataUrl).toBe(metadataUrlTestData);
		});
		test('does throw `InvalidSamlMetadataError` in case saml login is turned on and no valid metadata is available', async () => {
			await samlService.loadPreferencesWithoutValidation({
				metadata: 'not valid data',
				loginEnabled: true,
			});
			await expect(samlService.setSamlPreferences({})).rejects.toThrowError(
				invalid_saml_metadata_error_1.InvalidSamlMetadataError,
			);
		});
		test('does throw `InvalidSamlMetadataError` in case saml login is turned on and the metadata is an empty string', async () => {
			await samlService.loadPreferencesWithoutValidation({
				metadata: '',
				loginEnabled: true,
			});
			await expect(samlService.setSamlPreferences({})).rejects.toThrowError(
				invalid_saml_metadata_error_1.InvalidSamlMetadataError,
			);
		});
	});
	describe('getIdentityProviderInstance', () => {
		test('does throw `InvalidSamlMetadataError` when a metadata does not contain redirect binding', async () => {
			await samlService.loadPreferencesWithoutValidation({
				metadata: SamlMetadataWithoutRedirectBinding,
			});
			expect(() => samlService.getIdentityProviderInstance(true)).toThrowError(
				invalid_saml_metadata_error_1.InvalidSamlMetadataError,
			);
		});
	});
	describe('reset', () => {
		test('disables saml login and deletes the saml `features.saml` key in the db', async () => {
			jest.spyOn(samlHelpers, 'setSamlLoginEnabled');
			jest.spyOn(settingsRepository, 'delete');
			await samlService.reset();
			expect(samlHelpers.setSamlLoginEnabled).toHaveBeenCalledTimes(1);
			expect(samlHelpers.setSamlLoginEnabled).toHaveBeenCalledWith(false);
			expect(settingsRepository.delete).toHaveBeenCalledTimes(1);
			expect(settingsRepository.delete).toHaveBeenCalledWith({
				key: constants_1.SAML_PREFERENCES_DB_KEY,
			});
		});
	});
});
//# sourceMappingURL=saml.service.ee.test.js.map
