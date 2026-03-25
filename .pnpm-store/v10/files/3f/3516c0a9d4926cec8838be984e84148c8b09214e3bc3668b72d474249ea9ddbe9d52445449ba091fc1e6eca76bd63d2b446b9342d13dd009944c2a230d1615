/// <reference types="node" />

export interface header {
  [x: string]: any;
  protocol_id: number;
  major: number;
  minor: number;
  revision: number;
}

export interface frames {
  TYPE_AMQP: 0x00;
  TYPE_SASL: 0x01;
  read_header(buffer: Buffer): header;
  write_header(buffer: Buffer, header: header): number;
  read_frame(buffer: Buffer): any;
  write_frame(frame: any): Buffer;
  amqp_frame(channel: any, performative: any, payload: any): {
    [x: string]: any;
    channel: any | 0;
    type: 0x00;
    performative: any;
    payload: any;
  };
  sasl_frame(performative: any): {
    [x: string]: any;
    channel: 0;
    type: 0x01;
    performative: any;
  };
  open(obj?: any): any;
  begin(obj?: any): any;
  attach(obj?: any): any;
  flow(obj?: any): any;
  transfer(obj?: any): any;
  disposition(obj?: any): any;
  detach(obj?: any): any;
  end(obj?: any): any;
  close(obj?: any): any;
  sasl_mechanisms(obj?: any): any;
  sasl_init(obj?: any): any;
  sasl_challenge(obj?: any): any;
  sasl_response(obj?: any): any;
  sasl_outcome(obj?: any): any;
}
