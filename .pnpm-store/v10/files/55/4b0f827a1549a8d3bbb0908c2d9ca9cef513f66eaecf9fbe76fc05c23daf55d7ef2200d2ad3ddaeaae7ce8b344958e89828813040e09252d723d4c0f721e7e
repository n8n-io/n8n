// TypeScript Version: 2.8

import { Request, RequestHandler, Response, Express } from 'express';
import { DefaultMetricsCollectorConfiguration, Registry, RegistryContentType } from 'prom-client';

export {};

export = express_prom_bundle;

declare namespace express_prom_bundle {
  interface Labels {
    [key: string]: string | number;
  }

  type NormalizePathEntry = [string | RegExp, string];
  type NormalizePathFn = (req: Request, opts: Opts) => string;
  type NormalizeStatusCodeFn = (res: Response) => number | string;
  type TransformLabelsFn = (labels: Labels, req: Request, res: Response) => void;

  interface BaseOptions {
    autoregister?: boolean;

    customLabels?: { [key: string]: any };

    includeStatusCode?: boolean;
    includeMethod?: boolean;
    includePath?: boolean;
    includeUp?: boolean;

    bypass?:
      | ((req: Request) => boolean)
      | {
          onRequest?: (req: Request) => boolean;
          onFinish?: (req: Request, res: Response) => boolean;
        };

    excludeRoutes?: Array<string | RegExp>;

    metricsPath?: string;
    httpDurationMetricName?: string;
    promClient?: { collectDefaultMetrics?: DefaultMetricsCollectorConfiguration<RegistryContentType> };
    promRegistry?: Registry;
    normalizePath?: NormalizePathEntry[] | NormalizePathFn;
    formatStatusCode?: NormalizeStatusCodeFn;
    transformLabels?: TransformLabelsFn;
    urlPathReplacement?: string;
    metricsApp?: Express;

    // https://github.com/disjunction/url-value-parser#options
    urlValueParser?: {
      minHexLength?: number;
      minBase64Length?: number;
      replaceMasks?: Array<RegExp | string>;
      extraMasks?: Array<RegExp | string>;
    };
  }

  /** @see https://github.com/siimon/prom-client#summary */
  type SummaryOptions = BaseOptions & {
    metricType?: 'summary';
    percentiles?: number[];
    maxAgeSeconds?: number;
    ageBuckets?: number;
    pruneAgedBuckets?: boolean;
  }

  /** @see https://github.com/siimon/prom-client#histogram */
  type HistogramOptions = BaseOptions & {
    metricType?: 'histogram';
    buckets?: number[];
  }

  type Opts = SummaryOptions | HistogramOptions;

  interface Middleware extends RequestHandler {
    metricsMiddleware: RequestHandler;
  }

  const normalizePath: NormalizePathFn;
  const normalizeStatusCode: NormalizeStatusCodeFn;

  function clusterMetrics(): RequestHandler;
}

interface express_prom_bundle {
  normalizePath: express_prom_bundle.NormalizePathFn;
  normalizeStatusCode: express_prom_bundle.NormalizeStatusCodeFn;
}

declare function express_prom_bundle(opts: express_prom_bundle.Opts): express_prom_bundle.Middleware;
