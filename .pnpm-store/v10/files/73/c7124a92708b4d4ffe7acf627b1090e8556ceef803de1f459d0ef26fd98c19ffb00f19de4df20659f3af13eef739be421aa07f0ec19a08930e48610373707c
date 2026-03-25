declare function parseDiff(input?: string | null): parseDiff.File[];

declare namespace parseDiff {
  export interface File {
    chunks: Chunk[];
    deletions: number;
    additions: number;
    from?: string;
    to?: string;
    oldMode?: string;
    newMode?: string;
    index?: string[];
    deleted?: true;
    new?: true;
  }

  export interface Chunk {
    content: string;
    changes: Change[];
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
  }

  export interface NormalChange {
    type: 'normal';
    ln1: number;
    ln2: number;
    normal: true;
    content: string;
  }

  export interface AddChange {
    type: 'add';
    add: true;
    ln: number;
    content: string;
  }

  export interface DeleteChange {
    type: 'del';
    del: true;
    ln: number;
    content: string;
  }

  export type ChangeType = 'normal' | 'add' | 'del';

  export type Change = NormalChange | AddChange | DeleteChange;
}

export = parseDiff;
