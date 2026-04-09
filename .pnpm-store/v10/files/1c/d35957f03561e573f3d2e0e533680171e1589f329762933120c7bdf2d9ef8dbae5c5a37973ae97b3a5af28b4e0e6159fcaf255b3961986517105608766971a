export function getResponseMetadata({
  id,
  model,
  created,
  created_at,
}: {
  id?: string | undefined | null;
  created?: number | undefined | null;
  created_at?: number | undefined | null;
  model?: string | undefined | null;
}) {
  const unixTime = created ?? created_at;

  return {
    id: id ?? undefined,
    modelId: model ?? undefined,
    timestamp: unixTime != null ? new Date(unixTime * 1000) : undefined,
  };
}
