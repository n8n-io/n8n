import { appBindingsSchema } from '../../schemas/app-binding.schema';
import { Z } from '../../zod-class';

export class SetAppBindingsDto extends Z.class({ bindings: appBindingsSchema }, { strict: true }) {}
