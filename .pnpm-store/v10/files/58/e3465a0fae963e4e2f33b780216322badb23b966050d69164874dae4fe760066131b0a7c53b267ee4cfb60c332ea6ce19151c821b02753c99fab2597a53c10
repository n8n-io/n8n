/// <reference types="node" />

export declare interface Message {
  [x: string]: any;
  toJSON: () => {
    [x: string]: any;
  };
  toString: () => string;
}

export interface DeliveryOutcome {
  [x: string]: any;
}

export interface message {
  data_section: (data: any) => any;
  sequence_section: (list: any) => any;
  data_sections: (data_elements: any) => any;
  sequence_sections: (lists: any) => any;
  encode: (msg: any) => Buffer;
  decode: (buffer: Buffer) => Message;
  are_outcomes_equivalent: (a: any, b: any) => boolean;
  is_received: (o: Readonly<DeliveryOutcome>) => boolean;
  is_accepted: (o: Readonly<DeliveryOutcome>) => boolean;
  is_rejected: (o: Readonly<DeliveryOutcome>) => boolean;
  is_released: (o: Readonly<DeliveryOutcome>) => boolean;
  is_modified: (o: Readonly<DeliveryOutcome>) => boolean;
}
