import { Key } from "./key";

export type SelectKeyInput = string | Key;

export type SelectInput =
  | Select
  | Iterable<SelectKeyInput>
  | { keys?: Iterable<SelectKeyInput> }
  | null
  | undefined;

export class Select {
  private readonly keys: string[];

  constructor(keys: Iterable<SelectKeyInput> = []) {
    const unique = new Set<string>();
    for (const key of keys) {
      const normalized = key instanceof Key ? key.name : key;
      if (typeof normalized !== "string") {
        throw new TypeError("Select keys must be strings or Key instances");
      }
      unique.add(normalized);
    }
    this.keys = Array.from(unique);
  }

  public static from(input: SelectInput): Select {
    if (input instanceof Select) {
      return new Select(input.keys);
    }

    if (input === null || input === undefined) {
      return new Select();
    }

    if (Symbol.iterator in Object(input)) {
      return new Select(input as Iterable<SelectKeyInput>);
    }

    if (
      typeof input === "object" &&
      "keys" in (input as Record<string, unknown>)
    ) {
      const { keys } = input as { keys?: Iterable<SelectKeyInput> };
      return new Select(keys ?? []);
    }

    throw new TypeError("Unsupported select input");
  }

  public static all(): Select {
    return new Select([Key.DOCUMENT, Key.EMBEDDING, Key.METADATA, Key.SCORE]);
  }

  public get values(): string[] {
    return this.keys.slice();
  }

  public toJSON(): { keys: string[] } {
    return { keys: this.values };
  }
}
