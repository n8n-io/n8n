import { StructuredTool } from "@langchain/core/tools";
import { InferInteropZodOutput } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/tools/google_routes.d.ts

/**
 * Interface for parameter s required by GoogleRoutesAPI class.
 */
interface GoogleRoutesAPIParams {
  apiKey?: string;
}
declare const defaultGoogleRoutesSchema: z.ZodObject<{
  origin: z.ZodString;
  destination: z.ZodString;
  travel_mode: z.ZodEnum<["DRIVE", "WALK", "BICYCLE", "TRANSIT", "TWO_WHEELER"]>;
  computeAlternativeRoutes: z.ZodBoolean;
  departureTime: z.ZodOptional<z.ZodString>;
  arrivalTime: z.ZodOptional<z.ZodString>;
  transitPreferences: z.ZodOptional<z.ZodObject<{
    routingPreference: z.ZodEnum<["LESS_WALKING", "FEWER_TRANSFERS"]>;
  }, "strip", z.ZodTypeAny, {
    routingPreference: "FEWER_TRANSFERS" | "LESS_WALKING";
  }, {
    routingPreference: "FEWER_TRANSFERS" | "LESS_WALKING";
  }>>;
  extraComputations: z.ZodOptional<z.ZodArray<z.ZodEnum<["TOLLS"]>, "many">>;
}, "strip", z.ZodTypeAny, {
  origin: string;
  destination: string;
  travel_mode: "BICYCLE" | "DRIVE" | "TRANSIT" | "TWO_WHEELER" | "WALK";
  computeAlternativeRoutes: boolean;
  departureTime?: string | undefined;
  arrivalTime?: string | undefined;
  transitPreferences?: {
    routingPreference: "FEWER_TRANSFERS" | "LESS_WALKING";
  } | undefined;
  extraComputations?: "TOLLS"[] | undefined;
}, {
  origin: string;
  destination: string;
  travel_mode: "BICYCLE" | "DRIVE" | "TRANSIT" | "TWO_WHEELER" | "WALK";
  computeAlternativeRoutes: boolean;
  departureTime?: string | undefined;
  arrivalTime?: string | undefined;
  transitPreferences?: {
    routingPreference: "FEWER_TRANSFERS" | "LESS_WALKING";
  } | undefined;
  extraComputations?: "TOLLS"[] | undefined;
}>;
/**
 * Class for interacting with the Google Routes API
 * It extends the StructuredTool class to perform retrieval.
 */
declare class GoogleRoutesAPI extends StructuredTool {
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  name: string;
  description: string;
  protected apiKey: string;
  schema: typeof defaultGoogleRoutesSchema;
  constructor(fields?: GoogleRoutesAPIParams);
  _call(input: InferInteropZodOutput<typeof GoogleRoutesAPI.prototype.schema>): Promise<string>;
}
//#endregion
export { GoogleRoutesAPI, GoogleRoutesAPIParams };
//# sourceMappingURL=google_routes.d.cts.map