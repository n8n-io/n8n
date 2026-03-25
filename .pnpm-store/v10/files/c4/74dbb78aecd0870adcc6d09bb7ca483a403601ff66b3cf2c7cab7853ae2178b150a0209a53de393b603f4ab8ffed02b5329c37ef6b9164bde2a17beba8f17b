const assert = require('assert');
const RequestUtil = require('../lib/http/request_util');
const sfParams = require('../lib/constants/sf_params');

describe('RequestUtil', function () {
  describe('describeRequestFromOptions', function () {
    it('should describe request with default attributes when given basic request options', function () {
      const requestOptions = {
        method: 'get',
        url: 'https://example.com:8080/api/data?foo=bar',
        params: {
          requestId: '12345',
          // eslint-disable-next-line camelcase
          request_guid: 'abcde',
          warehouse: 'test_warehouse',
          databaseName: 'test_db',
          schemaName: 'test_schema',
        }
      };

      const result = RequestUtil.describeRequestFromOptions(requestOptions);

      // Check if defaults appear correctly
      assert.ok(result.includes('method=GET'), 'Should include method=GET');
      assert.ok(result.includes('baseUrl=https://example.com:8080'), 'Should include baseUrl');
      assert.ok(result.includes('path=/api/data'), 'Should include path');
      assert.ok(result.includes(`${sfParams.paramsNames.SF_REQUEST_ID}=12345`), 'Should include requestId');
      assert.ok(result.includes(`${sfParams.paramsNames.SF_REQUEST_GUID}=abcde`), 'Should include request_guid');
      assert.ok(result.includes(`${sfParams.paramsNames.SF_WAREHOUSE_NAME}=test_warehouse`), 'Should include warehouse');
      assert.ok(result.includes(`${sfParams.paramsNames.SF_DB_NAME}=test_db`), 'Should include databaseName');
      assert.ok(result.includes(`${sfParams.paramsNames.SF_SCHEMA_NAME}=test_schema`), 'Should include schemaName');

      // token not present, should not appear
      assert.ok(!result.includes('token='), 'Should not include token=');
      assert.ok(!result.includes('token is'), 'Should not include token presence');
    });

    it('should handle when no requestOptions are provided', function () {
      const result = RequestUtil.describeRequestFromOptions(undefined);
      // Should be empty brackets since nothing can be described
      assert.strictEqual(result, '[]', 'Should return empty brackets');
    });

    it('should use overridden attributes lists if provided', function () {
      const requestOptions = {
        method: 'post',
        url: 'https://example.org/resource?test=1',
        params: {
          token: 'secret_token_value'
        }
      };

      const overrideAttributesDescribedWithValues = ['baseUrl'];
      const overrideAttributesDescribedWithoutValues = ['token'];

      const result = RequestUtil.describeRequestFromOptions(requestOptions, {
        overrideAttributesDescribedWithValues,
        overrideAttributesDescribedWithoutValues
      });

      assert.ok(result.includes('baseUrl=https://example.org'), 'Should include only baseUrl with value');
      assert.ok(result.includes('token is provided'), 'Should indicate token is provided');
      // Should not have path or other defaults
      assert.ok(!result.includes('path='), 'Should not include path');
    });
  });

  describe('describeRequestFromResponse', function () {
    it('should describe the request from a response config', function () {
      const response = {
        config: {
          method: 'post',
          url: 'https://api.example.com/action?query=value',
          params: {
            // eslint-disable-next-line camelcase
            request_guid: 'xyz123',
            warehouse: 'wh1'
          }
        }
      };

      const result = RequestUtil.describeRequestFromResponse(response);
      assert.ok(result.includes('method=POST'), 'Should have POST method');
      assert.ok(result.includes('baseUrl=https://api.example.com'), 'Should have correct baseUrl');
      assert.ok(result.includes('path=/action'), 'Should have correct path');
      assert.ok(result.includes(`${sfParams.paramsNames.SF_REQUEST_GUID}=xyz123`), 'Should have request_guid');
      assert.ok(result.includes(`${sfParams.paramsNames.SF_WAREHOUSE_NAME}=wh1`), 'Should have warehouse');
    });

    it('should handle a response without config', function () {
      const response = {};
      const result = RequestUtil.describeRequestFromResponse(response);
      // No config means no attributes described
      assert.strictEqual(result, '[]', 'Should return empty brackets');
    });

    it('should allow overriding described attributes from a response', function () {
      const response = {
        config: {
          method: 'get',
          url: 'https://myapp.com/test?user=john',
          params: {
            token: 'abcd'
          }
        }
      };

      const result = RequestUtil.describeRequestFromResponse(response, {
        overrideAttributesDescribedWithValues: ['baseUrl'],
        overrideAttributesDescribedWithoutValues: ['token']
      });

      assert.ok(result.includes('baseUrl=https://myapp.com'), 'Should include overridden baseUrl');
      assert.ok(result.includes('token is provided'), 'Should indicate token is provided');
      assert.ok(!result.includes('path='), 'Should not include path since overridden');
    });
  });

  describe('describeURL', function () {
    it('should describe a URL using default attributes', function () {
      const url = 'https://example.net:3000/endpoint/sub?flag=true';
      const result = RequestUtil.describeURL(url);

      assert.ok(result.includes('baseUrl=https://example.net:3000'), 'Should include baseUrl');
      assert.ok(result.includes('path=/endpoint/sub'), 'Should include path');

      // Other defaults would not show because not set
      assert.ok(!result.includes('requestId='), 'Should not have requestId');
      assert.ok(!result.includes('token='), 'Should not have token');
    });

    it('should describe a URL with overridden attributes', function () {
      const url = 'https://something.com/path';
      const result = RequestUtil.describeURL(url, {
        overrideAttributesDescribedWithValues: ['baseUrl', 'path'],
        overrideAttributesDescribedWithoutValues: ['token']
      });

      assert.ok(result.includes('baseUrl=https://something.com'), 'Should have baseUrl');
      assert.ok(result.includes('path=/path'), 'Should have path');
      assert.ok(!result.includes('token is'), 'Should not indicate token presence');
    });

    it('should handle empty or invalid URLs', function () {
      const result = RequestUtil.describeURL('');
      assert.strictEqual(result, '[]', 'Should return empty brackets for invalid URL');
    });
  });
});
