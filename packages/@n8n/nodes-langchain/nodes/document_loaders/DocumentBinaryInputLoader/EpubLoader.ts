// Modified version of https://github.com/hwchase17/langchainjs/blob/main/langchain/src/document_loaders/fs/epub.ts
// to support loading of EPUB files from a Buffer
import { parseEpub } from '@gxl/epub-parser'
import { BaseDocumentLoader } from "langchain/document_loaders/base";
import { Document } from "langchain/document";
import { htmlToText } from "html-to-text";
/**
 * A class that extends the `BaseDocumentLoader` class. It represents a
 * document loader that loads documents from EPUB files.
 */
export class N8nEPubLoader extends BaseDocumentLoader {
  private splitChapters: boolean;

  constructor(public file: Buffer, { splitChapters = true } = {}) {
    super();
    this.splitChapters = splitChapters;
  }

  /**
   * A protected method that takes an EPUB object as a parameter and returns
   * a promise that resolves to an array of objects representing the content
   * and metadata of each chapter.
   * @param epub The EPUB object to parse.
   * @returns A promise that resolves to an array of objects representing the content and metadata of each chapter.
   */
  protected async parse(
    epub: ReturnType<typeof parseEpub>,
  ): Promise<{ pageContent: string; metadata?: object }[]> {
    // We await it here because epub-parsers doesn't export a type for the
    // return value of parseEpub.
		const parsed = await epub;

		const chapters = await Promise.all(
			(parsed.sections ?? []).map(async (chapter) => {
        if (!chapter.id) return null as never;

        const html = chapter.htmlString;
        if (!html) return null as never;

				return {
          html,
          title: chapter.id,
        };
      })
    );
    return chapters.filter(Boolean).map((chapter) => ({
      pageContent: htmlToText(chapter.html),
      metadata: {
        ...(chapter.title && { chapter: chapter.title }),
      },
    }));
  }

  /**
   * A method that loads the EPUB file and returns a promise that resolves
   * to an array of `Document` instances.
   * @returns A promise that resolves to an array of `Document` instances.
   */
  public async load(): Promise<Document[]> {
    const epub = parseEpub(this.file, { type: 'buffer' });
    const parsed = await this.parse(epub);

    return this.splitChapters
      ? parsed.map(
          (chapter) =>
            new Document({
              pageContent: chapter.pageContent,
              metadata: {
                ...chapter.metadata,
              },
            })
        )
      : [
          new Document({
            pageContent: parsed
              .map((chapter) => chapter.pageContent)
              .join("\n\n"),
          }),
        ];
  }
}
