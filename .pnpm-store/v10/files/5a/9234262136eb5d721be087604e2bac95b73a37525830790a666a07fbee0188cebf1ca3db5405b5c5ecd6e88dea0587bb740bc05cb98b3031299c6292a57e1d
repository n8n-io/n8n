export type Raw = {
    toSqlString(): string;
};
export type SqlValue = string | number | bigint | boolean | Date | Buffer | Uint8Array | Raw | Record<string, unknown> | SqlValue[] | null | undefined;
export type Timezone = 'local' | 'Z' | (string & NonNullable<unknown>);
