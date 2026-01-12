/**
 * Type for text content that can be single or multiple strings.
 *
 * Used throughout translation and text processing utilities to accept
 * both individual text items and batch operations. Simplifies API design
 * by supporting both single and bulk text processing patterns.
 */
export type Text = string | string[];
