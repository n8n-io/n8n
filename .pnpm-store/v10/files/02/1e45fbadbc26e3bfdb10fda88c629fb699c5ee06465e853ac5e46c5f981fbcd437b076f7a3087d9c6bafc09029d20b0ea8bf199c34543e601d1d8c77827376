import { FilePart, ImagePart, TextPart } from './content-part';
import { ProviderOptions } from './provider-options';

/**
 * A user message. It can contain text or a combination of text and images.
 */
export type UserModelMessage = {
  role: 'user';
  content: UserContent;

  /**
   * Additional provider-specific metadata. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;
};

/**
 * Content of a user message. It can be a string or an array of text and image parts.
 */
export type UserContent = string | Array<TextPart | ImagePart | FilePart>;
