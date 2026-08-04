import { z } from 'zod';

/**
 * Response for `POST /rest/otel/test-trace`: a discriminated success/error union.
 *
 * `Z.class` only models object shapes, so a union response needs a hand-rolled
 * class exposing `schema` + `parse` (what `@ApiResponse` and the generator read).
 * This is one of the "harder to migrate" response shapes (API-42).
 */
export class OtelTestTraceResponseDto {
	static schema = z.union([
		z.object({ success: z.literal(true) }),
		z.object({ success: z.literal(false), error: z.string() }),
	]);

	static parse(data: unknown) {
		return OtelTestTraceResponseDto.schema.parse(data);
	}
}
