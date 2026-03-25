import type {
  BatchRequestDocument,
  BatchRequestsOptions,
  GraphQLClientRequestHeaders,
  RawRequestExtendedOptions,
  RawRequestOptions,
  RequestDocument,
  RequestExtendedOptions,
  RequestOptions,
  Variables,
  VariablesAndRequestHeadersArgs,
} from './types.js'

export const parseRequestArgs = <V extends Variables = Variables>(
  documentOrOptions: RequestDocument | RequestOptions<V>,
  variables?: V,
  requestHeaders?: GraphQLClientRequestHeaders
): RequestOptions<V> => {
  return (documentOrOptions as RequestOptions<V>).document
    ? (documentOrOptions as RequestOptions<V>)
    : ({
        document: documentOrOptions as RequestDocument,
        variables: variables,
        requestHeaders: requestHeaders,
        signal: undefined,
      } as unknown as RequestOptions<V>)
}

export const parseRawRequestArgs = <V extends Variables = Variables>(
  queryOrOptions: string | RawRequestOptions<V>,
  variables?: V,
  requestHeaders?: GraphQLClientRequestHeaders
): RawRequestOptions<V> => {
  return (queryOrOptions as RawRequestOptions<V>).query
    ? (queryOrOptions as RawRequestOptions<V>)
    : ({
        query: queryOrOptions as string,
        variables: variables,
        requestHeaders: requestHeaders,
        signal: undefined,
      } as unknown as RawRequestOptions<V>)
}

export const parseBatchRequestArgs = <V extends Variables = Variables>(
  documentsOrOptions: BatchRequestDocument<V>[] | BatchRequestsOptions<V>,
  requestHeaders?: GraphQLClientRequestHeaders
): BatchRequestsOptions<V> => {
  return (documentsOrOptions as BatchRequestsOptions<V>).documents
    ? (documentsOrOptions as BatchRequestsOptions<V>)
    : {
        documents: documentsOrOptions as BatchRequestDocument<V>[],
        requestHeaders: requestHeaders,
        signal: undefined,
      }
}

export const parseRequestExtendedArgs = <V extends Variables = Variables>(
  urlOrOptions: string | RequestExtendedOptions<V>,
  document?: RequestDocument,
  ...variablesAndRequestHeaders: VariablesAndRequestHeadersArgs<V>
): RequestExtendedOptions<V> => {
  const [variables, requestHeaders] = variablesAndRequestHeaders
  return (urlOrOptions as RequestExtendedOptions<V>).document
    ? (urlOrOptions as RequestExtendedOptions<V>)
    : ({
        url: urlOrOptions as string,
        document: document as RequestDocument,
        variables,
        requestHeaders,
        signal: undefined,
      } as unknown as RequestExtendedOptions<V>)
}

export const parseRawRequestExtendedArgs = <V extends Variables = Variables>(
  urlOrOptions: string | RawRequestExtendedOptions<V>,
  query?: string,
  ...variablesAndRequestHeaders: VariablesAndRequestHeadersArgs<V>
): RawRequestExtendedOptions<V> => {
  const [variables, requestHeaders] = variablesAndRequestHeaders
  return (urlOrOptions as RawRequestExtendedOptions<V>).query
    ? (urlOrOptions as RawRequestExtendedOptions<V>)
    : ({
        url: urlOrOptions as string,
        query: query as string,
        variables,
        requestHeaders,
        signal: undefined,
      } as unknown as RawRequestExtendedOptions<V>)
}
