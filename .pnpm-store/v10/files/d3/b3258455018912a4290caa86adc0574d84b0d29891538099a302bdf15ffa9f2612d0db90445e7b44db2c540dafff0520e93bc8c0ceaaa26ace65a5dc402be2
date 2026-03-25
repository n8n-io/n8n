export interface PayloadRepository {
    [key: string]: any;
    full_name?: string;
    name: string;
    owner: {
        [key: string]: any;
        login: string;
        name?: string;
    };
    html_url?: string;
}
export interface WebhookPayload {
    [key: string]: any;
    repository?: PayloadRepository;
    issue?: {
        [key: string]: any;
        number: number;
        html_url?: string;
        body?: string;
    };
    pull_request?: {
        [key: string]: any;
        number: number;
        html_url?: string;
        body?: string;
    };
    sender?: {
        [key: string]: any;
        type: string;
    };
    action?: string;
    installation?: {
        id: number;
        [key: string]: any;
    };
    comment?: {
        id: number;
        [key: string]: any;
    };
}
