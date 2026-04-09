export function mockId({
  prefix = 'id',
}: {
  prefix?: string;
} = {}): () => string {
  let counter = 0;
  return () => `${prefix}-${counter++}`;
}
