/// <reference types="node" />

import { header, frames } from "./frames";
import { Socket } from "net";

export declare interface Transport {
  identifier: string;
  protocol_id: number;
  frame_type: number;
  handler: Function;
  pending: Buffer[];
  header_sent?: header;
  header_received?: header;
  write_complete: boolean;
  read_complete: boolean;
  has_writes_pending(): boolean;
  encode(frame: frames): void;
  write(socket: Socket): void;
  peek_size(buffer: Buffer): number | undefined;
  read(buffer: Buffer): number;
}
