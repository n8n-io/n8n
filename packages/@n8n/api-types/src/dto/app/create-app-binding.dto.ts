import { appBindingSchema } from '../../schemas/app-binding.schema';

// A zod schema instead of a `Z.class`: the body is one binding, a discriminated union on
// `kind`, which `@Body` reflection cannot resolve. The controller parses the body by hand.
export const CreateAppBindingDto = appBindingSchema;
