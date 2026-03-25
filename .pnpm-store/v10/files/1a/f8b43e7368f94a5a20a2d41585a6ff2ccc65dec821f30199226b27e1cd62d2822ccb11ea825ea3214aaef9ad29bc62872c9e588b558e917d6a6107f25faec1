import type { EndpointInterface } from "@octokit/types";
export default function fetchWrapper(requestOptions: ReturnType<EndpointInterface>): Promise<{
    status: number;
    url: string;
    headers: {
        [header: string]: string;
    };
    data: any;
}>;
