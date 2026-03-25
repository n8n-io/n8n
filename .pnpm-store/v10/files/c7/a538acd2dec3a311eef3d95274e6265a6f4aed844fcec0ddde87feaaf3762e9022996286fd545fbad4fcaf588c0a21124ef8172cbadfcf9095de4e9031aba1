{
  "image": "localhost/ai-opensource:latest",
  "forwardPorts": [],
  "mounts": [
    {
      "source": "pnpm-store",
      "target": "/home/ai/.local/share/pnpm/store",
      "type": "volume"
    },
    {
      "source": "shell-history",
      "target": "/home/ai/.local/share/history/",
      "type": "volume"
    }
  ],
  "workspaceMount": "",
  "runArgs": [
    "--userns=keep-id:uid=1000,gid=1000",
    "--volume=${localWorkspaceFolder}:/workspaces/${localWorkspaceFolderBasename}:Z",
    "--network=host",
    "--ulimit=host"
  ]
}
