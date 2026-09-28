import { z } from 'zod';

// A zod schema like `CreateAppBindingDto`: the allowed values depend on the binding kind,
// which only the stored binding knows. The service validates them through the binding schema.
export const UpdateAppBindingDto = z.object({
	permissions: z.array(z.string()).min(1),
});
