import {
	Hasura,


} from '../../../nodes/Gllue/GenericFunctions';
import {CV_SENT_EVENT, INTERVIEW_EVENT} from '../../../nodes/Gllue/constants';
import {ErrorMessageBuilder, EventChecker, SourceValidator, TokenValidator} from '../../../nodes/Gllue/validators';
import {SendEmailOnConsentService} from '../../../nodes/Gllue/services/email';
import {Gllue} from '../../../nodes/Gllue/services/gllue';


describe('error message builder', () => {
	it('should return on undefined', () => {
		const message = ErrorMessageBuilder.getMessage();
		expect(message).toEqual('Authorization problem!');
	});
	it('should return on 401', () => {
		const message = ErrorMessageBuilder.getMessage(401);
		expect(message).toEqual('Authorization is required!');
	});
	it('should return on 403', () => {
		const message = ErrorMessageBuilder.getMessage(403);
		expect(message).toEqual('Authorization data is wrong!');
	});
	it('should return on 202', () => {
		const message = ErrorMessageBuilder.getMessage(202);
		expect(message).toEqual('Skipped, event is not the same with webhook.');
	});
	it('should build headers with realm', () => {
		const header = ErrorMessageBuilder.getHeader('webhook');
		expect(header).toEqual({'WWW-Authenticate': 'Basic realm="webhook"'});
	});
	it('should set message', () => {
		const resp = {writeHead: jest.fn(), end: jest.fn()};
		const builder = new ErrorMessageBuilder(resp, 'webhook', 401);
		builder.handle();
		expect(resp.end).toHaveBeenCalledWith('Authorization is required!');
	});
	it('should set hander', () => {
		const resp = {writeHead: jest.fn(), end: jest.fn()};
		const builder = new ErrorMessageBuilder(resp, 'webhook', 403);
		builder.handle();
		expect(resp.writeHead).toHaveBeenCalledWith(403, {
			'WWW-Authenticate': 'Basic realm="webhook"',
		});
	});
	it('should return no webhook response', () => {
		const resp = {writeHead: jest.fn(), end: jest.fn()};
		const builder = new ErrorMessageBuilder(resp, 'webhook', 403);
		expect(builder.handle()).toEqual({noWebhookResponse: true});
	});
});

describe('token validator', () => {
	it('should miss on empty token', () => {
		const validator = new TokenValidator(undefined, 'expected-token');
		expect(validator.isMissing()).toBeTruthy();
	});
	it('should wrong on different token', () => {
		const validator = new TokenValidator('token', 'expected-token');
		expect(validator.isWrong()).toBeTruthy();
	});
});

describe('event check', () => {
	it('should be true on same event', () => {
		expect(EventChecker.isValid('cvsent', CV_SENT_EVENT)).toBeTruthy();
	});
	it('should be false on different event', () => {
		expect(EventChecker.isValid('cvsent', INTERVIEW_EVENT)).toBeFalsy();
	});
});

const SIMPLE_RESPONSE = {
	ids: [1234],
	result: {
		cvsent: [{id: 30817, gllueext_send_terms_cv_sent: 'yes'}],
		candidate: [{id: 1234, email: 'fake@email.com'}],
	},
};

const INTERVIEW_RESPONSE = {
	ids: [1234],
	result: {
		clientinterview: [{id: 31230}],
		candidate: [{id: 1234, email: 'fake@email.com'}],
	},
};
describe('gllue api', () => {
	it('should parse id', () => {
		const out = Gllue.extractIdAndEmail(SIMPLE_RESPONSE);
		expect(out.id).toEqual(1234);
	});
	it('should parse email', () => {
		const out = Gllue.extractIdAndEmail(SIMPLE_RESPONSE);
		expect(out.email).toEqual('fake@email.com');
	});
	it('should parse sent term on cv sent', () => {
		const out = Gllue.extractIdAndEmail(SIMPLE_RESPONSE);
		expect(out.cvsentField).toEqual('yes');
	});
	it('should parse with interview', () => {
		const out = Gllue.extractIdAndEmail(INTERVIEW_RESPONSE);
		expect(out.email).toEqual('fake@email.com');
	});
});

describe('consent send email logic', () => {
	it('should skip on consented', () => {
		const hasConsented = {consents: [{id: 'foobar'}]};
		const hasSent = {consents: []};
		const service = new SendEmailOnConsentService(
			hasConsented, hasSent, 'cvsent', null);
		expect(service.canSendEmail()).toBeFalsy();
	});
	it('should skip on sent in 30 days', () => {
		const hasConsented = {consents: []};
		const hasSent = {consents: [{id: 'has sent in 30 days'}]};
		const service = new SendEmailOnConsentService(
			hasConsented, hasSent, 'clientinterview', null);
		expect(service.canSendEmail()).toBeFalsy();
	});
	it('should skip without required', () => {
		const hasConsented = {consents: []};
		const hasSent = {consents: []};
		const hasRequired = null;
		const service = new SendEmailOnConsentService(
			hasConsented, hasSent, 'cvsent', hasRequired);
		expect(service.canSendEmail()).toBeFalsy();
	});
	it('should send with required', () => {
		const hasConsented = {consents: []};
		const hasSent = {consents: []};
		const hasRequired = 'yes';
		const service = new SendEmailOnConsentService(hasConsented, hasSent, 'cvsent', hasRequired);
		expect(service.canSendEmail()).toBeTruthy();
	});
	it('should send on interview', () => {
		const hasConsented = {consents: []};
		const hasSent = {consents: []};
		const hasRequired = null;
		const service = new SendEmailOnConsentService(
			hasConsented, hasSent, 'clientinterview', hasRequired);
		expect(service.canSendEmail()).toBeTruthy();
	});

	it('should send on interview', () => {
		const hasConsented = {consents: []};
		const hasSent = {consents: []};
		const hasRequired = 'yes';
		const service = new SendEmailOnConsentService(
			hasConsented, hasSent, 'clientinterview', hasRequired);
		expect(service.canSendEmail()).toBeTruthy();
	});
});

describe('gllue webhook validator', () => {
	it('raise on missing source', () => {
		const validator = new SourceValidator({});
		expect(() => {
			validator.check();
		}).toThrowError(new Error('Missing source in query of request'));
	});
	it('raise on invalid source', () => {
		const validator = new SourceValidator({source: 'Fake Gllue'});
		expect(() => {
			validator.check();
		}).toThrowError(new Error('"Fake Gllue" not in the valid list of [Brands Gllue]'));
	});
});


describe('Hasura Service', () => {
	it('should build uri with source and action', () => {
		const hasura = new Hasura(jest.fn());
		expect(hasura.getUrl()).toEqual('http://localhost:8083/api/rest/default-resource/default-action');
	});

	it('should build uri with undefined id', () => {
		const hasura = new Hasura(jest.fn());
		expect(hasura.getUrl(undefined)).toEqual('http://localhost:8083/api/rest/default-resource/default-action');
	});
	it('should build uri with :id', () => {
		const hasura = new Hasura(jest.fn());
		expect(hasura.getUrl('fake-id-xxx')).toEqual('http://localhost:8083/api/rest/default-resource/fake-id-xxx/default-action');
	});
});
