import { removeElement } from 'domutils';
import {
  type AnyNode,
  Document,
  type ParentNode,
  isDocument as checkIsDocument,
} from 'domhandler';
import type { InternalOptions } from './options.js';

/**
 * Get the parse function with options.
 *
 * @param parser - The parser function.
 * @returns The parse function with options.
 */
export function getParse(
  parser: (
    content: string,
    options: InternalOptions,
    isDocument: boolean,
    context: ParentNode | null,
  ) => Document,
) {
  /**
   * Parse a HTML string or a node.
   *
   * @param content - The HTML string or node.
   * @param options - The parser options.
   * @param isDocument - If `content` is a document.
   * @param context - The context node in the DOM tree.
   * @returns The parsed document node.
   */
  return function parse(
    content: string | Document | AnyNode | AnyNode[] | Buffer,
    options: InternalOptions,
    isDocument: boolean,
    context: ParentNode | null,
  ): Document {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(content)) {
      content = content.toString();
    }

    if (typeof content === 'string') {
      return parser(content, options, isDocument, context);
    }

    const doc = content as AnyNode | AnyNode[] | Document;

    if (!Array.isArray(doc) && checkIsDocument(doc)) {
      // If `doc` is already a root, just return it
      return doc;
    }

    // Add conent to new root element
    const root = new Document([]);

    // Update the DOM using the root
    update(doc, root);

    return root;
  };
}

/**
 * Update the dom structure, for one changed layer.
 *
 * @param newChilds - The new children.
 * @param parent - The new parent.
 * @returns The parent node.
 */
export function update(
  newChilds: AnyNode[] | AnyNode,
  parent: ParentNode | null,
): ParentNode | null {
  // Normalize
  const arr = Array.isArray(newChilds) ? newChilds : [newChilds];

  // Update parent
  if (parent) {
    parent.children = arr;
  } else {
    parent = null;
  }

  // Update neighbors
  for (let i = 0; i < arr.length; i++) {
    const node = arr[i];

    // Cleanly remove existing nodes from their previous structures.
    if (node.parent && node.parent.children !== arr) {
      removeElement(node);
    }

    if (parent) {
      node.prev = arr[i - 1] || null;
      node.next = arr[i + 1] || null;
    } else {
      node.prev = node.next = null;
    }

    node.parent = parent;
  }

  return parent;
}
