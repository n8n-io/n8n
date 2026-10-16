/**
 * A named statement Postgres parses and plans once per connection. Its text
 * must be static. Pass it to `query` as `{ ...statement, values }`.
 */
export type PreparedStatement = { name: string; text: string };
