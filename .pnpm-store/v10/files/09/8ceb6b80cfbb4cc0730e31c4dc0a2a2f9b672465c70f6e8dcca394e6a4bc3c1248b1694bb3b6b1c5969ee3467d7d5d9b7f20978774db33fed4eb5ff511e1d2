import { StagehandContainer } from "./StagehandContainer";

export {};
declare global {
  interface Window {
    chunkNumber: number;
    showChunks?: boolean;
    processDom: (chunksSeen: Array<number>) => Promise<{
      outputString: string;
      selectorMap: Record<number, string[]>;
      chunk: number;
      chunks: number[];
    }>;
    processAllOfDom: (xpath?: string) => Promise<{
      outputString: string;
      selectorMap: Record<number, string[]>;
    }>;
    debugDom: () => Promise<void>;
    cleanupDebug: () => void;
    createStagehandContainer: (obj: Window | HTMLElement) => StagehandContainer;
    waitForDomSettle: () => Promise<void>;
    __playwright?: unknown;
    __pw_manual?: unknown;
    __PW_inspect?: unknown;
    storeDOM: (xpath?: string) => string;
    restoreDOM: (storedDOM: string, xpath?: string) => void;
    createTextBoundingBoxes: (xpath?: string) => void;
    getElementBoundingBoxes: (xpath: string) => Array<{
      text: string;
      top: number;
      left: number;
      width: number;
      height: number;
    }>;
    getScrollableElementXpaths: (topN?: number) => Promise<string[]>;
    getNodeFromXpath: (xpath: string) => Node | null;
  }
}
