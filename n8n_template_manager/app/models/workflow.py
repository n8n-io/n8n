from sqlalchemy import Column, Integer, String, Text, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    source_path = Column(String)
    category = Column(String)
    raw_json = Column(Text)
    nodes_summary = Column(Text)  # Store as JSON string
    tags = Column(Text)  # Store as JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Workflow(id={self.id}, name='{self.name}')>"

# Example of how to create an engine and tables (though this will be in database.py)
# DATABASE_URL = "sqlite:///./test.db"
# engine = create_engine(DATABASE_URL)
# Base.metadata.create_all(engine)

# Example of how to create a session
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# db = SessionLocal()
# new_workflow = Workflow(id=1, name="Test Workflow", description="This is a test", raw_json="{}", nodes_summary="[]", tags="[]")
# db.add(new_workflow)
# db.commit()
# db.close()
