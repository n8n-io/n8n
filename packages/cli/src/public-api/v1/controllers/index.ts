/**
 * Side-effect imports for all `@PublicApiController` classes so their
 * decorator metadata is registered before PublicApiControllerRegistry /
 * scope-parity / discover run.
 */
import './executions.public.controller';
import './git-connections.public.controller';
import './role-mapping-rules.public.controller';
import './roles.public.controller';
import './source-control.public.controller';
import './tags.public.controller';
import './workflows.public.controller';
