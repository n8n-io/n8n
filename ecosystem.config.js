module.exports = {
    apps : [{
        name   : "n8n",
        script: "./packages/cli/bin/n8n start --tunnel",
        exec_interpreter: "none",
        exec_mode: "fork_mode",
        env: {
            N8N_ENCRYPTION_KEY:"011089Cm",
            WEBHOOK_URL:"https://connect.marketingmaster.io/",
            N8N_CONFIG_FILES:"./mmio-connect.config.json"
        }
    }]
}