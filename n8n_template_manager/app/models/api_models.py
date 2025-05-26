from pydantic import BaseModel
from typing import Optional, List as PyList # Renamed to PyList to avoid conflict with SQLAlchemy's List
from datetime import datetime

class WorkflowBase(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    nodes_summary: Optional[PyList[str]] = []
    tags: Optional[PyList[str]] = []
    source_path: Optional[str] = None

    class Config:
        orm_mode = True # Pydantic V1
        # from_attributes = True # Pydantic V2

class WorkflowDetail(WorkflowBase):
    raw_json: dict # Parsed JSON content
    created_at: datetime
    updated_at: datetime

class PaginatedWorkflows(BaseModel):
    total: int
    page: int
    size: int
    items: PyList[WorkflowBase]

class N8NImportRequest(BaseModel):
    template_id: int
    n8n_instance_url: str  # e.g., "https://my.n8n.instance.com" or "http://localhost:5678"
    n8n_api_key: str

class N8NImportResponse(BaseModel):
    success: bool
    message: str
    n8n_workflow_id: Optional[str] = None  # ID of the newly imported workflow in the target n8n
    n8n_workflow_url: Optional[str] = None # Direct URL to the imported workflow if possible
