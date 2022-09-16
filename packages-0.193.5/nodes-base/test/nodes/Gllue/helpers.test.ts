import {buildConsentUrl, buildOptionWithUri, convertEventPayload, UrlParams} from '../../../nodes/Gllue/helpers';
import {GllueEvent} from '../../../nodes/Gllue/interfaces';
import {BLUE_HOST, DEV_NODE_ENV, HOST_MAPPING, STAGING_NODE_ENV} from '../../../nodes/Gllue/constants';


const helpers = require('../../../nodes/Gllue/helpers');

const TIMESTAMP = '1613622240000';
const EMAIL = 'flash@cgptalent.com';
const TIMESTAMP_EMAIL_CONNECTED = `${TIMESTAMP},${EMAIL},`;
const SCALE_SIZE = 16;
const AES_KEY = 'eqs214hvIHEY7Reg';
const TOKEN = 'U5yBIIC7ieV934VhmvAeevpNSejoGUbbMHEJXXPSElN91gVC1aiONXWNC%2Frnc1Xn8H0NFdFar%2BNOB%2FkMkv1ZLw%3D%3D';

describe('Private Token Generator', () => {
	it('should connect the data with comma', () => {
		const realData = helpers.connectWithComma(TIMESTAMP, EMAIL);
		expect(realData).toStrictEqual(`${TIMESTAMP},${EMAIL},`);
	});
	it('should pad string with 16 length with 15', () => {
		const realData = helpers.get16TimesLength(15);
		expect(realData).toEqual(SCALE_SIZE);
	});
	it('should pad string with 16 length with 16', () => {
		const realData = helpers.get16TimesLength(SCALE_SIZE);
		expect(realData).toEqual(SCALE_SIZE);
	});

	it('should pad string with 32 length with 17', () => {
		const realData = helpers.get16TimesLength(17);
		expect(realData).toEqual(2 * SCALE_SIZE);
	});
	it('should pad string with 48 length with 33', () => {
		const realData = helpers.get16TimesLength(33);
		expect(realData).toEqual(3 * SCALE_SIZE);
	});
	it('should pad string with 48 length', () => {
		const realData = helpers.padWithSpaceIn16Times(TIMESTAMP_EMAIL_CONNECTED);
		expect(realData.length).toEqual(48);
	});
	it('should pad string with enough space', () => {
		const realData = helpers.padWithSpaceIn16Times(TIMESTAMP_EMAIL_CONNECTED);
		expect(realData).toEqual('1613622240000,flash@cgptalent.com,              ');
	});
	it('should generate token with AES KEY', () => {
		const realData = helpers.generateTokenWithAESKey(TIMESTAMP, EMAIL, AES_KEY);
		expect(realData).toEqual(TOKEN);
	});
});

const HOST = 'https://cgpo2o.cgptalent.cn';
const RESOURCE = 'client';
const OPTION = 'simple_list_with_ids';
const PAGINATION = 10;
const ORDERING = 'id';
const PAGE = 2;
const FIELDS = 'id,name';
const GQL = 'type__s=prospect,client';
const GQL_MULTIPLE = `${GQL}&keyword__eq=right`;
const BASE_URL = `${HOST}\/rest\/${RESOURCE}\/${OPTION}`;
const BLUE_BASE_URL = `${BLUE_HOST}\/rest\/${RESOURCE}\/${OPTION}`;
const BASE_PARAMS = 'fields=id&paginate_by=25&ordering=-id&page=1';
const DEFAULT_PARAMS = `${BASE_PARAMS}&private_token=${TOKEN}`;
const BLUE_DEFAULT_PARAMS = `${BASE_PARAMS}&gllue_private_token=${TOKEN}`;

describe('Gllue url parameters builder', () => {
	it('should build base url', () => {
		const uri = helpers.gllueUrlBuilder(HOST, RESOURCE, OPTION, null);
		expect(uri).toEqual(`${BASE_URL}`);
	});
	it('should build with default params', () => {
		const urlParams = new UrlParams('', 'id', TOKEN);
		const url = helpers.gllueUrlBuilder(HOST, RESOURCE, OPTION, urlParams);
		expect(url).toEqual(
			`${BASE_URL}?gql=&${DEFAULT_PARAMS}`);
	});
	it('should build with fields', () => {
		const urlParams = new UrlParams('', FIELDS, TOKEN, PAGINATION, PAGE, ORDERING);
		const url = helpers.gllueUrlBuilder(HOST, RESOURCE, OPTION, urlParams);
		expect(url).toEqual(
			`${BASE_URL}?gql=&fields=id,name&paginate_by=10&ordering=id&page=2&private_token=${TOKEN}`);
	});
	it('should build with a single gql query', () => {
		const urlParams = new UrlParams(GQL, 'id', TOKEN);
		const url = helpers.gllueUrlBuilder(HOST, RESOURCE, OPTION, urlParams);
		expect(url).toEqual(
			`${BASE_URL}?gql=type__s%3Dprospect%252Cclient` + `&${DEFAULT_PARAMS}`);
	});
	it('should build with multiple gql queries', () => {
		const urlParams = new UrlParams(GQL_MULTIPLE, 'id', TOKEN);
		const url = helpers.gllueUrlBuilder(HOST, RESOURCE, OPTION, urlParams);
		expect(url).toEqual(
			`${BASE_URL}?gql=type__s%3Dprospect%252Cclient%26keyword__eq%3Dright` +
			`&${DEFAULT_PARAMS}`);
	});
	it('should build with token', () => {
		const urlParams = new UrlParams('', 'id', TOKEN);
		const url = helpers.gllueUrlBuilder(HOST, RESOURCE, OPTION, urlParams);
		expect(url).toEqual(
			`${BASE_URL}?gql=&${DEFAULT_PARAMS}`);
	});
	it('should build with blue token', () => {
		const urlParams = new UrlParams('', 'id', TOKEN);
		const url = helpers.gllueUrlBuilder(BLUE_HOST, RESOURCE, OPTION, urlParams);
		expect(url).toEqual(
			`${BLUE_BASE_URL}?gql=&${BLUE_DEFAULT_PARAMS}`);
	});
});

describe('gllue event convert', () => {
	it('should parse data', () => {
		const item: GllueEvent = {
			date: '2022-01-12 08:33:48',
			info: '{"trigger_model_name":"clientinterview","trigger_model_id":30817,"trigger_mode":"CREATE",' +
				'"trigger_field":null,"trigger_time":"2022-01-12 08:33:48"}',
			sign: '407ee388772e372d3a118af4037c1453',
		};
		const outItem = convertEventPayload(item);
		expect(outItem).toEqual({
			'date': '2022-01-12 08:33:48',
			'info': {
				'trigger_field': null,
				'trigger_mode': 'CREATE',
				'trigger_model_id': 30817,
				'trigger_model_name': 'clientinterview',
				'trigger_time': '2022-01-12 08:33:48',
			},
			'sign': '407ee388772e372d3a118af4037c1453',
		});

	});
});

describe('build consent url', () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		jest.resetModules(); // Most important - it clears the cache
		process.env = {...OLD_ENV}; // Make a copy
	});

	afterAll(() => {
		process.env = OLD_ENV; // Restore old environment
	});

	const CONSENT_ID = 'fake-consent-id';

	it('should build url', () => {
		// Set the variables
		process.env.NODE_ENV = DEV_NODE_ENV;

		const url = buildConsentUrl(CONSENT_ID);
		expect(url).toEqual(
			`${HOST_MAPPING.dev}/webhook-test/consent/confirm?id=${CONSENT_ID}`);
	});
	it('should build staging url', () => {
		process.env.NODE_ENV = STAGING_NODE_ENV;

		const url = buildConsentUrl(CONSENT_ID);
		expect(url).toEqual(
			`${HOST_MAPPING.staging}/webhook/consent/confirm?id=${CONSENT_ID}`);
	});
	it('should raise on wrong stage', () => {
		process.env.NODE_ENV = 'local';

		expect(buildConsentUrl).toThrowError(
			new Error('Wrong stage name "local", you should provide any of [dev,staging,production]'));
	});
});

describe('prepareGllueApiUpdateData', () => {
	it('should build proper gllue update payload', () => {
		const data = helpers.prepareGllueApiUpdateData(123, {name: 'Name'});
		expect(Object.keys(data)).toEqual(['data']);
		expect(data).toEqual({data: '{"name":"Name","id":123}'});
	});
	it('should replace id in update date with id privided separately', () => {
		const data = helpers.prepareGllueApiUpdateData(123, {name: 'Name', id: 456});
		expect(Object.keys(data)).toEqual(['data']);
		expect(data).toEqual({data: '{"name":"Name","id":123}'});
	});
});

describe('build options with uri', () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		jest.resetModules(); // Most important - it clears the cache
		process.env = {...OLD_ENV}; // Make a copy
	});

	afterAll(() => {
		process.env = OLD_ENV; // Restore old environment
	});

	const URI = 'www.test-uri.com';
	const BASE_EXPECT_DATA = {
		json: true,
		method: 'GET',
		uri: URI,
	};
	it('should build with no header on undefined', () => {
		const data = buildOptionWithUri(URI);
		const expectData = {
			...BASE_EXPECT_DATA,
			headers: {Accept: 'application/json'},
		};
		expect(data).toEqual(expectData);
	});
	it('should build with key', () => {
		const key = 'admin-secret-key';
		process.env.X_HASURA_ADMIN_SECRET = key;
		const data = buildOptionWithUri(URI);
		const expectData = {
			...BASE_EXPECT_DATA,
			headers: {Accept: 'application/json', 'x-hasura-admin-secret': key},
		};
		expect(data).toEqual(expectData);

	});
});
