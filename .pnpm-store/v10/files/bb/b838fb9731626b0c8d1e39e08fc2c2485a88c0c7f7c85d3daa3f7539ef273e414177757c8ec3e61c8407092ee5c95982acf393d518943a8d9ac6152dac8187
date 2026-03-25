declare module "@n8n_io/riot-tmpl" {
  interface BracketSettings {
    brackets: string;
  }

  interface Brackets {
    set(token: string): void;
    settings: BracketSettings;
  }

  type ReturnValue = string | null | (() => unknown);
  interface Tmpl {
    errorHandler?(error: Error): void;
    getStr(expr: string): string;
    (value: string, data: unknown): ReturnValue;
  }

  let brackets: Brackets;
  let tmpl: Tmpl;
}
