const id = 'test-plugin-nested';

/** @type {import('../../config').PreprocessorsConfig} */
const preprocessors = {
  oas2: {
    'description-preprocessor': () => {
      return {
        Info(info) {
          const title = info.title || 'API title';
          info.description = `# ${title}\n\n${info.description || ''}`;
        },
      };
    },
  },
};

/** @type {import('../../config').CustomRulesConfig} */
const rules = {
  oas3: {
    'openid-connect-url-well-known': () => {
      return {
        SecurityScheme(scheme, { location, report }) {
          if (scheme.type === 'openIdConnect') {
            if (
              scheme.openIdConnectUrl &&
              !scheme.openIdConnectUrl.endsWith('/.well-known/openid-configuration')
            ) {
              report({
                message:
                  'openIdConnectUrl must be a URL that ends with /.well-known/openid-configuration',
                location: location.child('openIdConnectUrl'),
              });
            }
          }
        },
      };
    },
  },
};

/** @type {import('../../config').DecoratorsConfig} */
const decorators = {
  oas3: {
    'inject-x-stats': () => {
      return {
        Info(info) {
          info['x-stats'] = { test: 1 };
        },
      };
    },
  },
};

const configs = {
  all: {
    rules: {
      'local/operation-id-not-test': 'error',
      'boolean-parameter-prefixes': 'error',
    },
  },
};

module.exports = {
  id,
  preprocessors,
  rules,
  decorators,
  configs,
};
