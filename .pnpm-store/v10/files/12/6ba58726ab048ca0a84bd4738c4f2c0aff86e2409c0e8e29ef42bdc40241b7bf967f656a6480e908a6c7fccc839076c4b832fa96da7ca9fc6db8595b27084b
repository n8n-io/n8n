import { Stringable } from "./stringable";
export declare class XmlNode {
  private name;
  readonly children: Stringable[];
  private attributes;
  static of(name: string, childText?: string, withName?: string): XmlNode;
  constructor(name: string, children?: Stringable[]);
  withName(name: string): XmlNode;
  addAttribute(name: string, value: any): XmlNode;
  addChildNode(child: Stringable): XmlNode;
  removeAttribute(name: string): XmlNode;
  n(name: string): XmlNode;
  c(child: Stringable): XmlNode;
  a(name: string, value: any): XmlNode;
  cc(input: any, field: string, withName?: string): void;
  l(
    input: any,
    listName: string,
    memberName: string,
    valueProvider: Function
  ): void;
  lc(
    input: any,
    listName: string,
    memberName: string,
    valueProvider: Function
  ): void;
  toString(): string;
}
