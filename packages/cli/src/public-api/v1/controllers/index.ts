// Side-effect barrel: importing this populates `ControllerRegistryMetadata` with every
// `@PublicApiController`-decorated class. Both the real server (`public-api/index.ts`) and the
// OpenAPI generator (`openapi-gen/decorator-routes.ts`) import this same list, so there is one
// place to register a new public API controller rather than two.
import './tags.public.controller';
