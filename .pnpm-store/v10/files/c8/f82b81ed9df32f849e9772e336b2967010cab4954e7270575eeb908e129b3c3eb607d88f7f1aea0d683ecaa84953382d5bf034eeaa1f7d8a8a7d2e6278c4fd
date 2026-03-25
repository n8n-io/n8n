declare namespace PostgresInterval {
  export interface IPostgresInterval {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;

    toPostgres(): string;

    toISO(): string;
    toISOString(): string;
    toISOStringShort(): string;
  }
}

declare function PostgresInterval(raw: string): PostgresInterval.IPostgresInterval;

export = PostgresInterval;
