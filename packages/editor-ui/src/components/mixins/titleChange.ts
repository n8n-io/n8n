type Status = 'EXECUTING' | 'IDLE' | 'ERROR';

export default {
    /**
     * 
     * @param workflow Name of workflow
     * @param status Status of workflow
     */
    set (workflow : string, status : Status) {
        document.title = `n8n - ${workflow} - ${status}`;
    }
};