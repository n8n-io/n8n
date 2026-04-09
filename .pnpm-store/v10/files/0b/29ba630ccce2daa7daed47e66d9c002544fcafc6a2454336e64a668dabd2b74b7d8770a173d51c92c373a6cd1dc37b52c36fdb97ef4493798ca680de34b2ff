import { getContext } from '@vercel/oidc';
export { getVercelOidcToken } from '@vercel/oidc';

export async function getVercelRequestId(): Promise<string | undefined> {
  return getContext().headers?.['x-vercel-id'];
}
