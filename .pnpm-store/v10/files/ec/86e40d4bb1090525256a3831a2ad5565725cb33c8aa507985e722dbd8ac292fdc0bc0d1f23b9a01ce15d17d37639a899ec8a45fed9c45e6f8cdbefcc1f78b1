export interface InfoObject {
  title: string;
  version: string;
}

export interface ActionObject {
  target: string;
  description?: string;
  update?: unknown;
  remove?: boolean;
}
export interface Overlay1Definition {
  overlay: '1.0.0';
  info: InfoObject;
  extends?: string;
  actions: ActionObject[];
}

export const VERSION_PATTERN = /^1\.0\.\d+(-.+)?$/;
