declare namespace CliTable3 {
    type CharName =
        "top" |
        "top-mid" |
        "top-left" |
        "top-right" |
        "bottom" |
        "bottom-mid" |
        "bottom-left" |
        "bottom-right" |
        "left" |
        "left-mid" |
        "mid" |
        "mid-mid" |
        "right" |
        "right-mid" |
        "middle";

    type HorizontalAlignment = "left" | "center" | "right";
    type VerticalAlignment = "top" | "center" | "bottom";

    interface TableOptions {
        truncate: string;
        colWidths: Array<number | null>;
        rowHeights: Array<number | null>;
        colAligns: HorizontalAlignment[];
        rowAligns: VerticalAlignment[];
        head: string[];
        wordWrap: boolean;
        wrapOnWordBoundary: boolean;
    }

    interface TableInstanceOptions extends TableOptions {
        chars: Record<CharName, string>;
        style: {
            "padding-left": number;
            "padding-right": number;
            head: string[];
            border: string[];
            compact: boolean;
        };
    }

    interface TableConstructorOptions extends Partial<TableOptions> {
        chars?: Partial<Record<CharName, string>>;
        style?: Partial<TableInstanceOptions["style"]>;
    }

    type CellValue = boolean | number | bigint | string | null | undefined;

    interface CellOptions {
        content: CellValue;
        chars?: Partial<Record<CharName, string>>;
        truncate?: string;
        colSpan?: number;
        rowSpan?: number;
        hAlign?: HorizontalAlignment;
        vAlign?: VerticalAlignment;
        wordWrap?: boolean;
        wrapOnWordBoundary?: boolean;
        href?: string;
        style?: {
            "padding-left"?: number;
            "padding-right"?: number;
            head?: string[];
            border?: string[];
        };
    }

    interface GenericTable<T> extends Array<T> {
        options: TableInstanceOptions;
        readonly width: number;
    }

    type Table = GenericTable<HorizontalTableRow|VerticalTableRow|CrossTableRow>;
    type Cell = CellValue | CellOptions;

    type HorizontalTableRow = Cell[];

    interface VerticalTableRow {
        [name: string]: Cell;
    }

    interface CrossTableRow {
        [name: string]: Cell[];
    }
}

interface CliTable3 {
    new (options?: CliTable3.TableConstructorOptions): CliTable3.Table;
    readonly prototype: CliTable3.Table;
}

declare const CliTable3: CliTable3;

export = CliTable3;
