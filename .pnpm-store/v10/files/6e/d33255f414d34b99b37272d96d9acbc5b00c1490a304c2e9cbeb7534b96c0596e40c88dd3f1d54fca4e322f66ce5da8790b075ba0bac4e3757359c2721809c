import { RsaPublicKey, RsaPrivateKey, KeyLike } from 'crypto';
import { Connection } from './Connection.js';

export type AuthPlugin = (pluginMetadata: {
  connection: Connection;
  command: string;
}) => (
  pluginData: Buffer
) => Promise<string> | string | Buffer | Promise<Buffer> | null;

type AuthPluginDefinition<T> = (pluginOptions?: T) => AuthPlugin;

export const authPlugins: {
  caching_sha2_password: AuthPluginDefinition<{
    overrideIsSecure?: boolean;
    serverPublicKey?: RsaPublicKey | RsaPrivateKey | KeyLike;
    onServerPublicKey?: (data: Buffer) => void;
  }>;
  mysql_clear_password: AuthPluginDefinition<{
    password?: string;
  }>;
  mysql_native_password: AuthPluginDefinition<{
    password?: string;
    passwordSha1?: string;
  }>;
  sha256_password: AuthPluginDefinition<{
    serverPublicKey?: RsaPublicKey | RsaPrivateKey | KeyLike;
    onServerPublicKey?: (data: Buffer) => void;
  }>;
};
