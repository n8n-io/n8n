//#region src/utils/sse.d.ts
declare function BytesLineDecoder(): TransformStream<Uint8Array<ArrayBufferLike>, Uint8Array<ArrayBufferLike>>;
interface StreamPart {
  id: string | undefined;
  event: string;
  data: unknown;
}
declare function SSEDecoder(): TransformStream<Uint8Array<ArrayBufferLike>, StreamPart>;
//#endregion
export { BytesLineDecoder, SSEDecoder };
//# sourceMappingURL=sse.d.cts.map