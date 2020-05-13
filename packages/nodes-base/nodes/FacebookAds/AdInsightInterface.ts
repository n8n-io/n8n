import {
    IDataObject
} from 'n8n-workflow';
import { DateTime } from '../DateTime.node';

export interface IAdInsightParameters {
    action_attribution_windows?: string[];
    action_breakdowns?: string[];
    action_report_time?: string;
    breakdowns?: string[];
    date_preset?: string;
    default_summary?: boolean;
    export_columns?: string[];
    export_format?: string;
    export_name?: string;
    fields?: string[];
    filtering?: IFilter[];
    level?: string;
    product_id_limit?: number;
    sort?: string[];
    summary?: string[];
    summary_action_breakdowns?: string[];
    time_increment?: string | number;
    time_range?: ITimeRange;
    time_ranges?: ITimeRange[];
    use_account_attribution_setting?: boolean;
}

export interface IFilter {
    field: string;
    operator: string;
    value: string;
}

export interface ITimeRange {
    since: DateTime;
    until: DateTime;
}