import { BaseResolver, Document } from '../../../../resolve';
import { makeConfig, parseYamlToDocument } from '../../../../../__tests__/utils';
import { lintDocument } from '../../../../lint';
import { RuleConfig } from '../../../../config';

export async function lintDocumentForTest(
  rules: Record<string, RuleConfig>,
  document: Document,
  additionalDocuments: { absoluteRef: string; body: string }[]
) {
  const baseResolver = new BaseResolver();
  additionalDocuments.forEach((item) =>
    baseResolver.cache.set(
      item.absoluteRef,
      Promise.resolve(parseYamlToDocument(item.body, item.absoluteRef))
    )
  );
  return await lintDocument({
    externalRefResolver: baseResolver,
    document,
    config: await makeConfig({ rules }),
  });
}
