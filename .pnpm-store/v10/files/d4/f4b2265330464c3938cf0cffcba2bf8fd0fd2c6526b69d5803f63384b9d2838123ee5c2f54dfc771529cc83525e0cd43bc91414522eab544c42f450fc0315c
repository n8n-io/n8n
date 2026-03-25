//#region src/experimental/masking/transformer.d.ts
/**
 * Abstract class representing a transformer used for masking and rehydrating messages.
 */
declare abstract class MaskingTransformer {
  abstract transform(message: string, state?: Map<string, string>): Promise<[string, Map<string, string>]>;
  abstract rehydrate(message: string, state: Map<string, string>): Promise<string>;
}
//#endregion
export { MaskingTransformer };
//# sourceMappingURL=transformer.d.ts.map