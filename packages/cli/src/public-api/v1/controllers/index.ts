/**
 * Side-effect imports for all `@PublicApiController` classes so their
 * decorator metadata is registered before PublicApiControllerRegistry /
 * scope-parity / discover run.
 */
import './roles.public.controller';
import './tags.public.controller';
import './workflows.public.controller';
