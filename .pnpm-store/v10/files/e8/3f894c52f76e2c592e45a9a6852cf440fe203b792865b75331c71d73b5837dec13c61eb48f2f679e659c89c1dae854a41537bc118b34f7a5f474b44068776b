// version <= 1.25
import IdentityProvider, { IdentityProvider as IdentityProviderInstance } from './src/entity-idp';
import ServiceProvider, { ServiceProvider as ServiceProviderInstance } from './src/entity-sp';

export { default as IdPMetadata } from './src/metadata-idp';
export { default as SPMetadata } from './src/metadata-sp';
export { default as Utility } from './src/utility';
export { default as SamlLib } from './src/libsaml';
// roadmap
// new name convention in version >= 3.0
import * as Constants from './src/urn';
import * as Extractor from './src/extractor';

// exposed methods for customizing samlify
import { setSchemaValidator, setDOMParserOptions } from './src/api';

export {
  Constants,
  Extractor,
  // temp: resolve the conflict after version >= 3.0
  IdentityProvider,
  IdentityProviderInstance,
  ServiceProvider,
  ServiceProviderInstance,
  // set context
  setSchemaValidator,
  setDOMParserOptions
};